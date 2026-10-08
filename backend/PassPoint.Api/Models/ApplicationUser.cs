using Microsoft.AspNetCore.Identity;

namespace PassPoint.Api.Models;

public class ApplicationUser : IdentityUser
{
    public bool IsDemo { get; set; }
    public DateTime? DemoExpiresAtUtc { get; set; }

    public ICollection<PasswordEntry> PasswordEntries { get; } =
        new List<PasswordEntry>();
}
