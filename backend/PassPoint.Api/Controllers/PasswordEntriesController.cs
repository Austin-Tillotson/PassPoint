using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PassPoint.Api.Contracts.PasswordEntries;
using PassPoint.Api.Data;
using PassPoint.Api.Models;
using PassPoint.Api.Services;

namespace PassPoint.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/password-entries")]
public class PasswordEntriesController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IPasswordProtector _passwordProtector;

    public PasswordEntriesController(
        ApplicationDbContext context,
        UserManager<ApplicationUser> userManager,
        IPasswordProtector passwordProtector)
    {
        _context = context;
        _userManager = userManager;
        _passwordProtector = passwordProtector;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PasswordEntryResponse>>> GetAll()
    {
        var userId = _userManager.GetUserId(User);

        if (userId is null)
        {
            return Unauthorized();
        }

        var entries = await _context.PasswordEntries
            .AsNoTracking()
            .Where(entry => entry.UserId == userId)
            .OrderBy(entry => entry.SiteName)
            .ToListAsync();

        return Ok(entries.Select(ToResponse));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<PasswordEntryResponse>> GetById(Guid id)
    {
        var userId = _userManager.GetUserId(User);

        if (userId is null)
        {
            return Unauthorized();
        }

        var entry = await _context.PasswordEntries
            .AsNoTracking()
            .SingleOrDefaultAsync(entry =>
                entry.Id == id && entry.UserId == userId);

        if (entry is null)
        {
            return NotFound();
        }

        return Ok(ToResponse(entry));
    }

    [HttpPost]
    public async Task<ActionResult<PasswordEntryResponse>> Create(
        CreatePasswordEntryRequest request)
    {
        var userId = _userManager.GetUserId(User);

        if (userId is null)
        {
            return Unauthorized();
        }

        var siteName = request.SiteName.Trim();

        if (string.IsNullOrWhiteSpace(siteName))
        {
            return BadRequest(new
            {
                message = "Site name is required."
            });
        }

        var entry = new PasswordEntry
        {
            Id = Guid.NewGuid(),
            SiteName = siteName,
            EncryptedPassword = _passwordProtector.Protect(request.Password),
            CreatedAtUtc = DateTimeOffset.UtcNow,
            UserId = userId,
        };

        _context.PasswordEntries.Add(entry);
        await _context.SaveChangesAsync();

        var response = ToResponse(entry);

        return CreatedAtAction(nameof(GetById), new
        {
            id = entry.Id
        }, response);
    }

    private PasswordEntryResponse ToResponse(PasswordEntry entry)
    {
        return new PasswordEntryResponse
        {
            Id = entry.Id,
            SiteName = entry.SiteName,
            Password = _passwordProtector.Unprotect(entry.EncryptedPassword),
            CreatedAtUtc = entry.CreatedAtUtc,
        };
    }
}