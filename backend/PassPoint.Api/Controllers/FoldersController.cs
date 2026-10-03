using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using PassPoint.Api.Contracts.Folders;
using PassPoint.Api.Data;
using PassPoint.Api.Models;

namespace PassPoint.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/folders")]
public class FoldersController(ApplicationDbContext context) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized();

        return Ok(await context.Folders.AsNoTracking()
            .Where(folder => folder.UserId == userId)
            .OrderBy(folder => folder.Name)
            .Select(folder => new { folder.Id, folder.Name })
            .ToListAsync());
    }

    [HttpPost]
    public Task<IActionResult> Create(SaveFolderRequest request) => Save(null, request);

    [HttpPut("{id:guid}")]
    public Task<IActionResult> Update(Guid id, SaveFolderRequest request) => Save(id, request);

    private async Task<IActionResult> Save(Guid? id, SaveFolderRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized();

        var name = request.Name.Trim();
        if (name.Length is < 1 or > 50)
            return BadRequest(new { message = "Enter a folder name between 1 and 50 characters." });

        var folder = id.HasValue
            ? await context.Folders.SingleOrDefaultAsync(f => f.Id == id && f.UserId == userId)
            : new Folder { Id = Guid.NewGuid(), UserId = userId };
        if (folder is null) return NotFound();

        var normalizedName = name.ToUpperInvariant();
        if (await context.Folders.AnyAsync(f => f.UserId == userId &&
                f.NormalizedName == normalizedName && f.Id != folder.Id))
            return Conflict(new { message = "You already have a folder with that name." });

        folder.Name = name;
        folder.NormalizedName = normalizedName;
        if (!id.HasValue) context.Folders.Add(folder);

        try
        {
            await context.SaveChangesAsync();
        }
        catch (DbUpdateException exception) when
            (exception.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            return Conflict(new { message = "You already have a folder with that name." });
        }

        var response = new { folder.Id, folder.Name };
        return id.HasValue ? Ok(response) : StatusCode(StatusCodes.Status201Created, response);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized();

        await using var transaction = await context.Database.BeginTransactionAsync();
        var folder = await context.Folders.SingleOrDefaultAsync(f => f.Id == id && f.UserId == userId);
        if (folder is null) return NotFound();

        await context.PasswordEntries.Where(e => e.UserId == userId && e.FolderId == id)
            .ExecuteUpdateAsync(update => update.SetProperty(e => e.FolderId, (Guid?)null));
        context.Folders.Remove(folder);

        try
        {
            await context.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch (DbUpdateException exception) when
            (exception.InnerException is PostgresException { SqlState: PostgresErrorCodes.ForeignKeyViolation })
        {
            return Conflict(new { message = "This folder changed while it was being deleted. Please try again." });
        }

        return NoContent();
    }
}

