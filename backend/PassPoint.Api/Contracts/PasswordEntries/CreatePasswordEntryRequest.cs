using System.ComponentModel.DataAnnotations;

namespace PassPoint.Api.Contracts.PasswordEntries;

public class CreatePasswordEntryRequest
{
    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string SiteName { get; set; } = string.Empty;

    [Required]
    [StringLength(500, MinimumLength = 1)]
    public string Password { get; set; } = string.Empty;
}