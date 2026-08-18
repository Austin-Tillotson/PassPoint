using Microsoft.AspNetCore.Identity;

namespace PassPoint.Api.Models;

public class ApplicationUser : IdentityUser
{
    public ICollection<PasswordEntry> PasswordEntries { get; } =
        new List<PasswordEntry>();
}