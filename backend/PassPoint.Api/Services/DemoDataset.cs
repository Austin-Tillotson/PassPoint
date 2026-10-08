namespace PassPoint.Api.Services;

// Edit this file to curate the starting workspace. These are fictional sample secrets.
public static class DemoDataset
{
    public static readonly string[] FolderNames = ["Work", "Personal", "Finance"];
    public record SampleEntry(string Site, string Password, string? Folder, bool Favorite = false);
    public static readonly SampleEntry[] Entries =
    [
        new("https://github.com/Austin-Tillotson", "github-test-password-123^", "Work", true),
        new("figma.com", "figma-test-password-123^", "Work"),
        new("notion.so", "notion-test-password-123^", "Personal"),
        new("spotify.com", "spotify-test-password-123^", "Personal", true),
        new("example.com", "example-test-password-123^", null),
        new("wikipedia.org", "wikipedia-test-password-123^", null),
        new("facebook.com", "facebook-test-password-123^", "Personal", true),
        new("x.com", "x-test-password-123^", "Personal", true),
        new("youtube.com", "youtube-test-password-123^", "Personal", true),
        new("etrade.com", "etrade-test-password-123^", "Finance"),
        new("instagram.com", "instagram-test-password-123^", "Personal"),
    ];
}
