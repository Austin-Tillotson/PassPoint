namespace PassPoint.Api.Contracts.PasswordEntries;

public class PasswordEntryResponse
{
    public bool IsFavorite { get; set; }

    public Guid? FolderId { get; set; }

    public Guid Id { get; set; }

    public string SiteName { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;

    public DateTimeOffset CreatedAtUtc { get; set; }
}
