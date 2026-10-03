using System.ComponentModel.DataAnnotations;

namespace PassPoint.Api.Contracts.Folders;

public class SaveFolderRequest
{
    [Required, StringLength(50)]
    public string Name { get; set; } = string.Empty;
}

