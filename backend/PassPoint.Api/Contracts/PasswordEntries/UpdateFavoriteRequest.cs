using System.ComponentModel.DataAnnotations;

namespace PassPoint.Api.Contracts.PasswordEntries;

public class UpdateFavoriteRequest
{
    [Required]
    public bool? IsFavorite { get; set; }
}

public record FavoriteStatusResponse(Guid Id, bool IsFavorite);
