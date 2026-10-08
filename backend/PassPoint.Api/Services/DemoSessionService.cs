using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using PassPoint.Api.Data;
using PassPoint.Api.Models;

namespace PassPoint.Api.Services;

public class DemoSessionService(ApplicationDbContext context, UserManager<ApplicationUser> users,
    IPasswordProtector protector, TimeProvider clock)
{
    public const string ClaimType = "passpoint_demo";
    public static readonly TimeSpan Lifetime = TimeSpan.FromHours(2);

    public Task<bool> IsActiveAsync(string userId) => context.Users.AnyAsync(user =>
        user.Id == userId && user.IsDemo && user.DemoExpiresAtUtc > clock.GetUtcNow().UtcDateTime);

    public async Task<ApplicationUser> CreateAsync(CancellationToken cancellationToken = default)
    {
        await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);
        var user = new ApplicationUser
        {
            UserName = $"demo-{Guid.NewGuid():N}",
            IsDemo = true,
            DemoExpiresAtUtc = clock.GetUtcNow().UtcDateTime.Add(Lifetime),
        };
        // No password: demo accounts are accessed only through their issued session cookie.
        var result = await users.CreateAsync(user);
        if (!result.Succeeded) throw new InvalidOperationException("Unable to create demo account.");
        Seed(user.Id);
        await context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return user;
    }

    private void Seed(string userId)
    {
        var folders = DemoDataset.FolderNames.Select(name => new Folder
        {
            Id = Guid.NewGuid(), UserId = userId, Name = name, NormalizedName = name.ToUpperInvariant(),
        }).ToDictionary(folder => folder.Name);
        context.Folders.AddRange(folders.Values);
        context.PasswordEntries.AddRange(DemoDataset.Entries.Select((sample, index) => new PasswordEntry
        {
            Id = Guid.NewGuid(), UserId = userId, SiteName = sample.Site,
            Username = sample.Username,
            EncryptedPassword = protector.Protect(sample.Password),
            FolderId = sample.Folder is null ? null : folders[sample.Folder].Id,
            IsFavorite = sample.Favorite,
            CreatedAtUtc = clock.GetUtcNow().AddDays(-index),
        }));
    }

    public async Task<bool> ResetAsync(string userId, CancellationToken cancellationToken = default)
    {
        await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);
        if (!await context.Users.AnyAsync(user => user.Id == userId && user.IsDemo &&
            user.DemoExpiresAtUtc > clock.GetUtcNow().UtcDateTime, cancellationToken)) return false;
        await context.PasswordEntries.Where(entry => entry.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await context.Folders.Where(folder => folder.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        Seed(userId);
        await context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return true;
    }

    public async Task DeleteAsync(string userId, CancellationToken cancellationToken = default)
    {
        await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);
        if (!await context.Users.AnyAsync(user => user.Id == userId && user.IsDemo, cancellationToken)) return;
        // Explicit order also respects the non-cascading folder-to-entry relationship.
        await context.PasswordEntries.Where(entry => entry.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await context.Folders.Where(folder => folder.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await context.Users.Where(user => user.Id == userId && user.IsDemo).ExecuteDeleteAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }

    public async Task CleanupAsync(CancellationToken cancellationToken = default)
    {
        // Bound each pass so a backlog does not monopolize the database.
        var expired = await context.Users.Where(user => user.IsDemo &&
            (user.DemoExpiresAtUtc == null || user.DemoExpiresAtUtc <= clock.GetUtcNow().UtcDateTime))
            .OrderBy(user => user.DemoExpiresAtUtc).Select(user => user.Id).Take(200).ToListAsync(cancellationToken);
        foreach (var id in expired) await DeleteAsync(id, cancellationToken);
    }
}
