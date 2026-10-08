using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using PassPoint.Api.Contracts.Auth;
using PassPoint.Api.Models;
using PassPoint.Api.Data;
using PassPoint.Api.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.RateLimiting;
using System.Security.Claims;

namespace PassPoint.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly ApplicationDbContext _context;
    private readonly DemoSessionService _demos;

    public AuthController(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        ApplicationDbContext context,
        DemoSessionService demos)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _context = context;
        _demos = demos;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        if (string.Equals(request.Username.Trim(), "Demo", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { errors = new[] { "Please choose a different username." } });
        var user = new ApplicationUser
        {
            UserName = request.Username.Trim()
        };

        await using var transaction = await _context.Database.BeginTransactionAsync();
        var result = await _userManager.CreateAsync(user, request.Password);

        if (!result.Succeeded)
        {
            return BadRequest(new
            {
                errors = result.Errors.Select(error => error.Description)
            });
        }

        _context.Folders.AddRange(new[] { "Work", "Personal", "Finance" }.Select(name => new Folder
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = name,
            NormalizedName = name.ToUpperInvariant(),
        }));
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        return StatusCode(StatusCodes.Status201Created, new
        {
            username = user.UserName
        });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        // Retire the old public shared-account credentials.
        if (string.Equals(request.Username.Trim(), "Demo", StringComparison.OrdinalIgnoreCase))
            return Unauthorized(new { message = "Use Explore demo to start a private demo workspace." });
        var result = await _signInManager.PasswordSignInAsync(
            request.Username.Trim(),
            request.Password,
            isPersistent: false,
            lockoutOnFailure: false);

        if (!result.Succeeded)
        {
            return Unauthorized(new
            {
                message = "Invalid username or password."
            });
        }

        return NoContent();
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user?.IsDemo == true) await _demos.DeleteAsync(user.Id, HttpContext.RequestAborted);
        await _signInManager.SignOutAsync();

        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUser()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user is null) return Unauthorized();
        return Ok(new
        {
            username = user.IsDemo ? "Demo workspace" : user.UserName,
            isDemo = user.IsDemo,
            demoExpiresAtUtc = user.DemoExpiresAtUtc,
        });
    }

    [HttpPost("demo")]
    [EnableRateLimiting("demo")]
    public async Task<IActionResult> StartDemo()
    {
        var current = await _userManager.GetUserAsync(User);
        if (current is not null)
        {
            if (!current.IsDemo) return Conflict(new { message = "Sign out before starting a demo." });
            if (await _demos.IsActiveAsync(current.Id)) return NoContent();
        }
        var user = await _demos.CreateAsync(HttpContext.RequestAborted);
        await _signInManager.SignInWithClaimsAsync(user, new AuthenticationProperties
        {
            IsPersistent = false,
            AllowRefresh = false,
            ExpiresUtc = new DateTimeOffset(user.DemoExpiresAtUtc!.Value, TimeSpan.Zero),
        }, [new Claim(DemoSessionService.ClaimType, "true")]);
        return NoContent();
    }

    [Authorize]
    [HttpPost("demo/reset")]
    [EnableRateLimiting("demo")]
    public async Task<IActionResult> ResetDemo()
    {
        var id = _userManager.GetUserId(User);
        return id is not null && await _demos.ResetAsync(id, HttpContext.RequestAborted)
            ? NoContent() : Forbid();
    }
}
