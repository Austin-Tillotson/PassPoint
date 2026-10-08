using System.ComponentModel.DataAnnotations;

namespace PassPoint.Api.Contracts.PasswordEntries;

public class UpdatePasswordEntryRequest
{
    private Guid? _folderId;
    private string? _username;

    [StringLength(256)]
    public string? Username
    {
        get => _username;
        set { _username = value; HasUsername = true; }
    }

    // Preserve usernames when an older client omits this new field.
    [System.Text.Json.Serialization.JsonIgnore]
    public bool HasUsername { get; private set; }

    // Older clients omit this field. Only explicit null should remove an assignment.
    public Guid? FolderId
    {
        get => _folderId;
        set { _folderId = value; HasFolderId = true; }
    }

    [System.Text.Json.Serialization.JsonIgnore]
    public bool HasFolderId { get; private set; }
    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string SiteName { get; set; } = string.Empty;

    [Required]
    [StringLength(500, MinimumLength = 1)]
    public string Password { get; set; } = string.Empty;
}
