namespace PassPoint.Api.Models;

public class PasswordEntry
{
    public Guid Id { get; set; }
    public Guid? FolderId { get; set; }
    public bool IsFavorite { get; set; }

    public string SiteName { get; set; } = string.Empty;

    [System.ComponentModel.DataAnnotations.StringLength(256)]
    public string? Username { get; set; }

    public string EncryptedPassword { get; set; } = string.Empty;

    public DateTimeOffset CreatedAtUtc { get; set; }

    public string UserId { get; set; } = string.Empty;

    public ApplicationUser User { get; set; } = null!;
}
