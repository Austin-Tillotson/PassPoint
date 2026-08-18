namespace PassPoint.Api.Contracts.PasswordEntries;

public class PasswordEntryResponse
{
    public Guid Id { get; set; }

    public string SiteName { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;

    public DateTimeOffset CreatedAtUtc { get; set; }
}