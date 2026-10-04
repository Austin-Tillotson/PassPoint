using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PassPoint.Api.Contracts.PasswordEntries;
using PassPoint.Api.Controllers;
using PassPoint.Api.Models;

namespace PassPoint.Api.Tests;

public partial class FolderTests
{
    [Fact]
    public async Task FavoritesSetOnlyTheFlagAndAreIdempotent()
    {
        var folder = new Folder { Id = Guid.NewGuid(), UserId = "alice", Name = "Work", NormalizedName = "WORK" };
        var entry = new PasswordEntry { Id = Guid.NewGuid(), UserId = "alice", FolderId = folder.Id,
            SiteName = "https://example.com", EncryptedPassword = "protected:secret", CreatedAtUtc = DateTimeOffset.UtcNow };
        Context.AddRange(folder, entry);
        await Context.SaveChangesAsync();
        Assert.False(entry.IsFavorite);
        var controller = PasswordController();

        for (var attempt = 0; attempt < 2; attempt++)
        {
            var result = Assert.IsType<OkObjectResult>(await controller.SetFavorite(entry.Id,
                new UpdateFavoriteRequest { IsFavorite = true }));
            Assert.Equal(new FavoriteStatusResponse(entry.Id, true), result.Value);
        }
        Context.ChangeTracker.Clear();
        var saved = await Context.PasswordEntries.SingleAsync();
        Assert.True(saved.IsFavorite);
        Assert.Equal(folder.Id, saved.FolderId);
        Assert.Equal(entry.SiteName, saved.SiteName);
        Assert.Equal(entry.EncryptedPassword, saved.EncryptedPassword);
        Assert.Equal(entry.CreatedAtUtc, saved.CreatedAtUtc);

        await controller.SetFavorite(entry.Id, new UpdateFavoriteRequest { IsFavorite = false });
        Context.ChangeTracker.Clear();
        Assert.False((await Context.PasswordEntries.SingleAsync()).IsFavorite);
    }

    [Fact]
    public async Task FavoriteEndpointRejectsForeignMissingAndAbsentValues()
    {
        var entry = new PasswordEntry { Id = Guid.NewGuid(), UserId = "bob",
            SiteName = "https://example.com", EncryptedPassword = "protected:secret" };
        Context.Add(entry);
        await Context.SaveChangesAsync();
        var controller = PasswordController();
        Assert.IsType<NotFoundResult>(await controller.SetFavorite(entry.Id,
            new UpdateFavoriteRequest { IsFavorite = true }));
        Assert.IsType<NotFoundResult>(await controller.SetFavorite(Guid.NewGuid(),
            new UpdateFavoriteRequest { IsFavorite = true }));
        Assert.IsType<BadRequestObjectResult>(await controller.SetFavorite(entry.Id,
            new UpdateFavoriteRequest()));
        Assert.IsType<UnauthorizedResult>(await AsUser(controller, "").SetFavorite(entry.Id,
            new UpdateFavoriteRequest { IsFavorite = true }));
        Context.ChangeTracker.Clear();
        Assert.False((await Context.PasswordEntries.SingleAsync()).IsFavorite);
    }

    [Fact]
    public async Task EditingAndDeletingFoldersPreservesFavoriteStatus()
    {
        var folder = new Folder { Id = Guid.NewGuid(), UserId = "alice", Name = "Work", NormalizedName = "WORK" };
        var entry = new PasswordEntry { Id = Guid.NewGuid(), UserId = "alice", FolderId = folder.Id,
            SiteName = "https://example.com", EncryptedPassword = "protected:secret", IsFavorite = true };
        Context.AddRange(folder, entry);
        await Context.SaveChangesAsync();
        var controller = PasswordController();
        var result = await controller.Update(entry.Id, new UpdatePasswordEntryRequest
        {
            SiteName = "https://changed.example", Password = "new secret",
        });
        var response = Assert.IsType<PasswordEntryResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.True(response.IsFavorite);
        await AsUser(new FoldersController(Context)).Delete(folder.Id);
        Context.ChangeTracker.Clear();
        var saved = await Context.PasswordEntries.SingleAsync();
        Assert.True(saved.IsFavorite);
        Assert.Null(saved.FolderId);
    }
}
