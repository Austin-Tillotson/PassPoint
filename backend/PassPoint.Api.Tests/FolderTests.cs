using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PassPoint.Api.Contracts.Folders;
using PassPoint.Api.Controllers;
using PassPoint.Api.Data;
using PassPoint.Api.Models;

namespace PassPoint.Api.Tests;

public partial class FolderTests : IDisposable
{
    private readonly SqliteConnection connection = new("Data Source=:memory:");
    protected readonly ServiceProvider Services;
    protected readonly ApplicationDbContext Context;

    public FolderTests()
    {
        connection.Open();
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddDbContext<ApplicationDbContext>(options => options.UseSqlite(connection));
        services.AddIdentity<ApplicationUser, IdentityRole>().AddEntityFrameworkStores<ApplicationDbContext>();
        services.AddSingleton<Microsoft.AspNetCore.DataProtection.IDataProtectionProvider>(
            new Microsoft.AspNetCore.DataProtection.EphemeralDataProtectionProvider());
        Services = services.BuildServiceProvider();
        Context = Services.GetRequiredService<ApplicationDbContext>();
        Context.Database.EnsureCreated();
        Context.Users.AddRange(new ApplicationUser { Id = "alice", UserName = "alice" },
            new ApplicationUser { Id = "bob", UserName = "bob" });
        Context.SaveChanges();
    }

    protected static T AsUser<T>(T controller, string user = "alice") where T : ControllerBase
    {
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(
                    new[] { new Claim(ClaimTypes.NameIdentifier, user) }, "test")),
            },
        };
        return controller;
    }

    [Fact]
    public async Task NamesAreTrimmedAndUniquePerAccount()
    {
        var controller = AsUser(new FoldersController(Context));
        Assert.IsType<ObjectResult>(await controller.Create(new SaveFolderRequest { Name = " Work " }));
        Assert.Equal("Work", (await Context.Folders.SingleAsync()).Name);
        Assert.IsType<ConflictObjectResult>(await controller.Create(new SaveFolderRequest { Name = "work" }));
        Assert.IsType<ObjectResult>(await AsUser(new FoldersController(Context), "bob")
            .Create(new SaveFolderRequest { Name = "Work" }));
        Assert.IsType<BadRequestObjectResult>(await controller.Create(new SaveFolderRequest { Name = "  " }));
    }

    [Fact]
    public async Task CannotRenameOrDeleteAnotherAccountsFolder()
    {
        var folder = new Folder { Id = Guid.NewGuid(), UserId = "bob", Name = "Private", NormalizedName = "PRIVATE" };
        Context.Folders.Add(folder);
        await Context.SaveChangesAsync();
        var controller = AsUser(new FoldersController(Context));
        Assert.IsType<NotFoundResult>(await controller.Update(folder.Id, new SaveFolderRequest { Name = "Changed" }));
        Assert.IsType<NotFoundResult>(await controller.Delete(folder.Id));
        Assert.Equal("Private", (await Context.Folders.SingleAsync()).Name);
    }

    [Fact]
    public async Task DeleteUnfilesPasswordsWithoutChangingSecrets()
    {
        var folder = new Folder { Id = Guid.NewGuid(), UserId = "alice", Name = "Work", NormalizedName = "WORK" };
        var entry = new PasswordEntry { Id = Guid.NewGuid(), UserId = "alice", FolderId = folder.Id,
            SiteName = "https://example.com", EncryptedPassword = "encrypted", CreatedAtUtc = DateTimeOffset.UtcNow };
        Context.AddRange(folder, entry);
        await Context.SaveChangesAsync();
        Assert.IsType<NoContentResult>(await AsUser(new FoldersController(Context)).Delete(folder.Id));
        Context.ChangeTracker.Clear();
        var saved = await Context.PasswordEntries.SingleAsync();
        Assert.Null(saved.FolderId);
        Assert.Equal("encrypted", saved.EncryptedPassword);
        Assert.Empty(await Context.Folders.ToListAsync());
    }

    [Fact]
    public async Task DatabaseRejectsCrossAccountAssignment()
    {
        var folder = new Folder { Id = Guid.NewGuid(), UserId = "bob", Name = "Work", NormalizedName = "WORK" };
        Context.Folders.Add(folder);
        await Context.SaveChangesAsync();
        Context.PasswordEntries.Add(new PasswordEntry { Id = Guid.NewGuid(), UserId = "alice",
            FolderId = folder.Id, SiteName = "example", EncryptedPassword = "encrypted" });
        await Assert.ThrowsAsync<DbUpdateException>(() => Context.SaveChangesAsync());
    }

    [Fact]
    public async Task RegistrationCreatesDefaultsOnlyOnce()
    {
        var controller = new AuthController(Services.GetRequiredService<UserManager<ApplicationUser>>(),
            Services.GetRequiredService<SignInManager<ApplicationUser>>(), Context,
            new PassPoint.Api.Services.DemoSessionService(Context,
                Services.GetRequiredService<UserManager<ApplicationUser>>(),
                new PassPoint.Api.Services.PasswordProtector(new Microsoft.AspNetCore.DataProtection.EphemeralDataProtectionProvider()),
                TimeProvider.System));
        var request = new PassPoint.Api.Contracts.Auth.RegisterRequest
        {
            Username = "new-user", Password = "ValidPassword1!",
        };
        var result = Assert.IsType<ObjectResult>(await controller.Register(request));
        Assert.Equal(201, result.StatusCode);
        Assert.Equal(new[] { "Finance", "Personal", "Work" },
            await Context.Folders.OrderBy(f => f.Name).Select(f => f.Name).ToArrayAsync());
        Assert.IsType<BadRequestObjectResult>(await controller.Register(request));
        Assert.Equal(3, await Context.Folders.CountAsync());
    }

    public void Dispose()
    {
        Services.Dispose();
        connection.Dispose();
    }
}
