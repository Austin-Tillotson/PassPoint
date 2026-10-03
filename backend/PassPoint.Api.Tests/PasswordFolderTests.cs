using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PassPoint.Api.Contracts.PasswordEntries;
using PassPoint.Api.Controllers;
using PassPoint.Api.Models;
using PassPoint.Api.Services;

namespace PassPoint.Api.Tests;

public partial class FolderTests
{
    private class TestProtector : IPasswordProtector
    {
        public string Protect(string password) => "protected:" + password;
        public string Unprotect(string password) => password.Replace("protected:", "");
    }

    private PasswordEntriesController PasswordController() => AsUser(new PasswordEntriesController(
        Context, Services.GetRequiredService<UserManager<ApplicationUser>>(), new TestProtector()));

    [Fact]
    public async Task PasswordAssignmentRejectsForeignAndMissingFolders()
    {
        var foreign = new Folder { Id = Guid.NewGuid(), UserId = "bob", Name = "Work", NormalizedName = "WORK" };
        Context.Folders.Add(foreign);
        await Context.SaveChangesAsync();
        foreach (var id in new[] { foreign.Id, Guid.NewGuid() })
        {
            var result = await PasswordController().Create(new CreatePasswordEntryRequest
            {
                SiteName = "https://example.com", Password = "secret", FolderId = id,
            });
            Assert.IsType<BadRequestObjectResult>(result.Result);
        }
        Assert.Empty(await Context.PasswordEntries.ToListAsync());
    }

    [Fact]
    public async Task PasswordAssignmentSupportsMovePreserveAndUnfile()
    {
        var folder = new Folder { Id = Guid.NewGuid(), UserId = "alice", Name = "Work", NormalizedName = "WORK" };
        Context.Folders.Add(folder);
        await Context.SaveChangesAsync();
        var controller = PasswordController();
        var created = await controller.Create(new CreatePasswordEntryRequest
        {
            SiteName = "https://example.com", Password = "secret", FolderId = folder.Id,
        });
        var response = Assert.IsType<PasswordEntryResponse>(Assert.IsType<CreatedAtActionResult>(created.Result).Value);
        Assert.Equal(folder.Id, response.FolderId);
        Assert.Equal("secret", response.Password);

        var omitted = JsonSerializer.Deserialize<UpdatePasswordEntryRequest>(
            """{"SiteName":"https://example.com","Password":"updated"}""")!;
        Assert.False(omitted.HasFolderId);
        await controller.Update(response.Id, omitted);
        Assert.Equal(folder.Id, (await Context.PasswordEntries.SingleAsync()).FolderId);

        var explicitNull = JsonSerializer.Deserialize<UpdatePasswordEntryRequest>(
            """{"SiteName":"https://example.com","Password":"updated","FolderId":null}""")!;
        Assert.True(explicitNull.HasFolderId);
        await controller.Update(response.Id, explicitNull);
        Assert.Null((await Context.PasswordEntries.SingleAsync()).FolderId);

        await controller.Update(response.Id, new UpdatePasswordEntryRequest
        {
            SiteName = "https://example.com", Password = "updated", FolderId = folder.Id,
        });
        Assert.Equal(folder.Id, (await Context.PasswordEntries.SingleAsync()).FolderId);
    }

    [Fact]
    public async Task InvalidMoveLeavesPasswordAndAssignmentUnchanged()
    {
        var controller = PasswordController();
        var created = await controller.Create(new CreatePasswordEntryRequest
        {
            SiteName = "https://example.com", Password = "secret",
        });
        var response = Assert.IsType<PasswordEntryResponse>(Assert.IsType<CreatedAtActionResult>(created.Result).Value);
        var update = await controller.Update(response.Id, new UpdatePasswordEntryRequest
        {
            SiteName = "https://changed.com", Password = "changed", FolderId = Guid.NewGuid(),
        });
        Assert.IsType<BadRequestObjectResult>(update.Result);
        var saved = await Context.PasswordEntries.SingleAsync();
        Assert.Null(saved.FolderId);
        Assert.Equal("https://example.com", saved.SiteName);
        Assert.Equal("protected:secret", saved.EncryptedPassword);
    }
}

