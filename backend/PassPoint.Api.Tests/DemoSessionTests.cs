using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PassPoint.Api.Models;
using PassPoint.Api.Services;

namespace PassPoint.Api.Tests;

public class DemoSessionTests : FolderTests
{
    private readonly DemoClock clock = new();
    private readonly IPasswordProtector protector = new PasswordProtector(new EphemeralDataProtectionProvider());
    private DemoSessionService CreateService(IPasswordProtector? replacement = null) => new(
        Context, Services.GetRequiredService<UserManager<ApplicationUser>>(), replacement ?? protector, clock);

    [Fact]
    public async Task StartingDemoIssuesCookieAndLogoutDeletesItsData()
    {
        var signIn = Services.GetRequiredService<SignInManager<ApplicationUser>>();
        var http = new Microsoft.AspNetCore.Http.DefaultHttpContext { RequestServices = Services };
        signIn.Context = http;
        var controller = new PassPoint.Api.Controllers.AuthController(
            Services.GetRequiredService<UserManager<ApplicationUser>>(), signIn, Context, CreateService())
        {
            ControllerContext = new Microsoft.AspNetCore.Mvc.ControllerContext { HttpContext = http },
        };
        Assert.IsType<Microsoft.AspNetCore.Mvc.NoContentResult>(await controller.StartDemo());
        Assert.Contains(".AspNetCore.Identity.Application=", http.Response.Headers.SetCookie.ToString());
        Assert.True(http.User.HasClaim(DemoSessionService.ClaimType, "true"));
        var id = Services.GetRequiredService<UserManager<ApplicationUser>>().GetUserId(http.User);
        Assert.IsType<Microsoft.AspNetCore.Mvc.NoContentResult>(await controller.Logout());
        Assert.False(await Context.Users.AnyAsync(user => user.Id == id));
        Assert.Empty(await Context.PasswordEntries.ToListAsync());
        Assert.Empty(await Context.Folders.ToListAsync());
    }

    [Fact]
    public async Task StartingAgainReusesDemoAndDoesNotReplaceRegularAccount()
    {
        var service = CreateService();
        var demo = await service.CreateAsync();
        var controller = new PassPoint.Api.Controllers.AuthController(
            Services.GetRequiredService<UserManager<ApplicationUser>>(),
            Services.GetRequiredService<SignInManager<ApplicationUser>>(), Context, service);

        Assert.IsType<Microsoft.AspNetCore.Mvc.NoContentResult>(await AsUser(controller, demo.Id).StartDemo());
        Assert.Single(await Context.Users.Where(user => user.IsDemo).ToListAsync());
        Assert.IsType<Microsoft.AspNetCore.Mvc.ConflictObjectResult>(await AsUser(controller).StartDemo());
        Assert.IsType<Microsoft.AspNetCore.Mvc.ForbidResult>(await controller.ResetDemo());
    }

    [Fact]
    public async Task CreatesIndependentSeededAccountsWithoutPasswords()
    {
        var service = CreateService();
        var first = await service.CreateAsync();
        var second = await service.CreateAsync();
        Assert.NotEqual(first.Id, second.Id);
        Assert.True(first.IsDemo);
        Assert.Null(first.PasswordHash);
        Assert.Equal(clock.GetUtcNow().UtcDateTime.AddHours(2), first.DemoExpiresAtUtc);
        var entries = await Context.PasswordEntries.Where(entry => entry.UserId == first.Id).ToListAsync();
        Assert.Equal(DemoDataset.Entries.Length, entries.Count);
        Assert.Equal(3, await Context.Folders.CountAsync(folder => folder.UserId == first.Id));
        Assert.Contains(entries, entry => entry.IsFavorite);
        Assert.Contains(entries, entry => entry.FolderId == null);
        foreach (var entry in entries)
        {
            var sample = DemoDataset.Entries.Single(sample => sample.Site == entry.SiteName);
            Assert.NotEqual(sample.Password, entry.EncryptedPassword);
            Assert.Equal(sample.Password, protector.Unprotect(entry.EncryptedPassword));
        }
        await service.DeleteAsync(first.Id);
        Assert.Equal(DemoDataset.Entries.Length, await Context.PasswordEntries.CountAsync(entry => entry.UserId == second.Id));
        Assert.False(await Context.Users.AnyAsync(user => user.Id == first.Id));
        Assert.False(await Context.Folders.AnyAsync(folder => folder.UserId == first.Id));
    }

    [Fact]
    public async Task ExpirationRejectsAccessBeforeCleanupAndSurvivesServiceRecreation()
    {
        var service = CreateService();
        var user = await service.CreateAsync();
        Assert.True(await service.IsActiveAsync(user.Id));
        clock.Advance(TimeSpan.FromHours(2));
        Assert.False(await CreateService().IsActiveAsync(user.Id));
        Assert.True(await Context.Users.AnyAsync(item => item.Id == user.Id));
        Assert.False(await service.ResetAsync(user.Id));
        await CreateService().CleanupAsync();
        Assert.False(await Context.Users.AnyAsync(item => item.Id == user.Id));
    }

    [Fact]
    public async Task CleanupPreservesRegularAndUnexpiredAccounts()
    {
        var service = CreateService();
        var expired = await service.CreateAsync();
        clock.Advance(TimeSpan.FromHours(1));
        var active = await service.CreateAsync();
        var alice = await Context.Users.FindAsync("alice");
        alice!.DemoExpiresAtUtc = clock.GetUtcNow().UtcDateTime.AddDays(-1);
        await Context.SaveChangesAsync();
        clock.Advance(TimeSpan.FromHours(1));
        await service.CleanupAsync();
        Assert.False(await Context.Users.AnyAsync(user => user.Id == expired.Id));
        Assert.True(await Context.Users.AnyAsync(user => user.Id == active.Id));
        Assert.True(await Context.Users.AnyAsync(user => user.Id == "alice"));
        Assert.True(await Context.Users.AnyAsync(user => user.Id == "bob"));
    }

    [Fact]
    public async Task ResetRestoresDatasetWithoutExtendingLifetimeAndCannotModifyRegularAccounts()
    {
        var service = CreateService();
        var user = await service.CreateAsync();
        var expiry = user.DemoExpiresAtUtc;
        await Context.PasswordEntries.Where(entry => entry.UserId == user.Id).ExecuteDeleteAsync();
        Context.ChangeTracker.Clear();
        clock.Advance(TimeSpan.FromMinutes(10));
        Assert.True(await service.ResetAsync(user.Id));
        Assert.Equal(DemoDataset.Entries.Length, await Context.PasswordEntries.CountAsync(entry => entry.UserId == user.Id));
        Assert.Equal(expiry, (await Context.Users.FindAsync(user.Id))!.DemoExpiresAtUtc);
        Assert.False(await service.ResetAsync("alice"));
        await service.DeleteAsync("alice");
        Assert.True(await Context.Users.AnyAsync(item => item.Id == "alice"));
    }

    [Fact]
    public async Task FailedSeedingRollsBackTheEntireAccount()
    {
        await Assert.ThrowsAsync<InvalidOperationException>(() => CreateService(new BrokenProtector()).CreateAsync());
        Context.ChangeTracker.Clear();
        Assert.False(await Context.Users.AnyAsync(user => user.IsDemo));
        Assert.Empty(await Context.Folders.ToListAsync());
        Assert.Empty(await Context.PasswordEntries.ToListAsync());
    }

    private class DemoClock : TimeProvider
    {
        private DateTimeOffset now = new(2026, 10, 6, 12, 0, 0, TimeSpan.Zero);
        public override DateTimeOffset GetUtcNow() => now;
        public void Advance(TimeSpan elapsed) => now += elapsed;
    }

    private class BrokenProtector : IPasswordProtector
    {
        public string Protect(string value) => throw new InvalidOperationException("Test seed failure");
        public string Unprotect(string value) => throw new NotSupportedException();
    }
}
