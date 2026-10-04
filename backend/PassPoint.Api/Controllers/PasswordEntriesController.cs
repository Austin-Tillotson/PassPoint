using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
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

        if (!await OwnsFolder(userId, request.FolderId))
            return BadRequest(new { message = "Choose one of your folders or Unfiled." });

        var entry = new PasswordEntry
        {
            Id = Guid.NewGuid(),
            SiteName = siteName,
            EncryptedPassword = _passwordProtector.Protect(request.Password),
            CreatedAtUtc = DateTimeOffset.UtcNow,
            UserId = userId,
            FolderId = request.FolderId,
        };

        _context.PasswordEntries.Add(entry);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException exception) when
            (exception.InnerException is PostgresException { SqlState: PostgresErrorCodes.ForeignKeyViolation })
        {
            return Conflict(new { message = "The selected folder is no longer available. Choose another folder or Unfiled." });
        }

        return CreatedAtAction(nameof(GetById), new
        {
            id = entry.Id
        }, ToResponse(entry));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<PasswordEntryResponse>> Update(
        Guid id,
        UpdatePasswordEntryRequest request)
    {
        var userId = _userManager.GetUserId(User);

        if (userId is null)
        {
            return Unauthorized();
        }

        var entry = await _context.PasswordEntries
            .SingleOrDefaultAsync(entry =>
                entry.Id == id && entry.UserId == userId);

        if (entry is null)
        {
            return NotFound();
        }

        var siteName = request.SiteName.Trim();

        if (string.IsNullOrWhiteSpace(siteName))
        {
            return BadRequest(new
            {
                message = "Site name is required."
            });
        }

        if (request.HasFolderId)
        {
            if (!await OwnsFolder(userId, request.FolderId))
                return BadRequest(new { message = "Choose one of your folders or Unfiled." });
            entry.FolderId = request.FolderId;
        }

        entry.SiteName = siteName;
        entry.EncryptedPassword = _passwordProtector.Protect(request.Password);

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException exception) when
            (exception.InnerException is PostgresException { SqlState: PostgresErrorCodes.ForeignKeyViolation })
        {
            return Conflict(new { message = "The selected folder is no longer available. Choose another folder or Unfiled." });
        }

        return Ok(ToResponse(entry));
    }

    [HttpPut("{id:guid}/favorite")]
    public async Task<IActionResult> SetFavorite(Guid id, UpdateFavoriteRequest request)
    {
        var userId = _userManager.GetUserId(User);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        if (request.IsFavorite is not bool isFavorite)
            return BadRequest(new { message = "Favorite status is required." });

        // Update only this column; concurrent password/folder edits remain intact.
        var updated = await _context.PasswordEntries
            .Where(entry => entry.Id == id && entry.UserId == userId)
            .ExecuteUpdateAsync(update => update.SetProperty(entry => entry.IsFavorite, isFavorite));

        return updated == 0 ? NotFound() : Ok(new FavoriteStatusResponse(id, isFavorite));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = _userManager.GetUserId(User);

        if (userId is null)
        {
            return Unauthorized();
        }

        var entry = await _context.PasswordEntries
            .SingleOrDefaultAsync(entry =>
                entry.Id == id && entry.UserId == userId);

        if (entry is null)
        {
            return NotFound();
        }

        _context.PasswordEntries.Remove(entry);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException exception) when
            (exception.InnerException is PostgresException { SqlState: PostgresErrorCodes.ForeignKeyViolation })
        {
            return Conflict(new { message = "The selected folder is no longer available. Choose another folder or Unfiled." });
        }

        return NoContent();
    }

    private Task<bool> OwnsFolder(string userId, Guid? folderId) =>
        folderId is null ? Task.FromResult(true) :
            _context.Folders.AnyAsync(folder => folder.Id == folderId && folder.UserId == userId);

    private PasswordEntryResponse ToResponse(PasswordEntry entry)
    {
        return new PasswordEntryResponse
        {
            Id = entry.Id,
            FolderId = entry.FolderId,
            IsFavorite = entry.IsFavorite,
            SiteName = entry.SiteName,
            Password = _passwordProtector.Unprotect(entry.EncryptedPassword),
            CreatedAtUtc = entry.CreatedAtUtc,
        };
    }
}
