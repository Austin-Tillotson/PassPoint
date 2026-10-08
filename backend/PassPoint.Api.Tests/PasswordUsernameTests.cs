using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PassPoint.Api.Contracts.PasswordEntries;

namespace PassPoint.Api.Tests;

public partial class FolderTests
{
    [Fact]
    public async Task UsernameRoundTripsAndCanBeEditedPreservedAndCleared()
    {
        var controller = PasswordController();
        var created = Assert.IsType<CreatedAtActionResult>((await controller.Create(new CreatePasswordEntryRequest
        {
            SiteName = "github.com", Password = "secret", Username = "  gitdemouser123  ",
        })).Result);
        var entry = Assert.IsType<PasswordEntryResponse>(created.Value);
        Assert.Equal("gitdemouser123", entry.Username);
        Context.ChangeTracker.Clear();
        Assert.Equal("gitdemouser123", (await Context.PasswordEntries.SingleAsync()).Username);
        var read = Assert.IsType<OkObjectResult>((await controller.GetById(entry.Id)).Result);
        Assert.Equal(entry.Username, Assert.IsType<PasswordEntryResponse>(read.Value).Username);
        var list = Assert.IsType<OkObjectResult>((await controller.GetAll()).Result);
        Assert.Equal(entry.Username, Assert.Single(Assert.IsAssignableFrom<IEnumerable<PasswordEntryResponse>>(list.Value)).Username);

        var edited = Assert.IsType<OkObjectResult>((await controller.Update(entry.Id, new UpdatePasswordEntryRequest
        {
            SiteName = entry.SiteName, Password = "secret", Username = "another-user",
        })).Result);
        Assert.Equal("another-user", Assert.IsType<PasswordEntryResponse>(edited.Value).Username);

        var oldClient = JsonSerializer.Deserialize<UpdatePasswordEntryRequest>(
            "{\"SiteName\":\"github.com\",\"Password\":\"changed\"}")!;
        var preserved = Assert.IsType<OkObjectResult>((await controller.Update(entry.Id, oldClient)).Result);
        Assert.Equal("another-user", Assert.IsType<PasswordEntryResponse>(preserved.Value).Username);

        var forbidden = await AsUser(PasswordController(), "bob").Update(entry.Id, new UpdatePasswordEntryRequest
        {
            SiteName = entry.SiteName, Password = "secret", Username = "foreign-user",
        });
        Assert.IsType<NotFoundResult>(forbidden.Result);

        foreach (var blank in new string?[] { "   ", null })
        {
            var cleared = Assert.IsType<OkObjectResult>((await controller.Update(entry.Id, new UpdatePasswordEntryRequest
            {
                SiteName = entry.SiteName, Password = "secret", Username = blank,
            })).Result);
            Assert.Null(Assert.IsType<PasswordEntryResponse>(cleared.Value).Username);
        }
    }

    [Fact]
    public async Task UsernameIsOptionalAndLengthLimited()
    {
        var created = Assert.IsType<CreatedAtActionResult>((await PasswordController().Create(new CreatePasswordEntryRequest
        {
            SiteName = "example.com", Password = "secret",
        })).Result);
        Assert.Null(Assert.IsType<PasswordEntryResponse>(created.Value).Username);
        foreach (var request in new object[]
        {
            new CreatePasswordEntryRequest { SiteName = "example.com", Password = "secret", Username = new string('a', 257) },
            new UpdatePasswordEntryRequest { SiteName = "example.com", Password = "secret", Username = new string('a', 257) },
        })
        {
            var errors = new List<ValidationResult>();
            Assert.False(Validator.TryValidateObject(request, new ValidationContext(request), errors, true));
            Assert.Contains(errors, error => error.MemberNames.Contains("Username"));
        }
    }
}
