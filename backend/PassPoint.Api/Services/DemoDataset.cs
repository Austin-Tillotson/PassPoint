namespace PassPoint.Api.Services;

// Edit this file to curate the starting workspace. These are fictional sample secrets.
public static class DemoDataset
{
    public static readonly string[] FolderNames = ["Work", "Personal", "Finance"];
    public record SampleEntry(string Site, string Password, string? Folder, string Username, bool Favorite = false);
    public static readonly SampleEntry[] Entries =
    [
        new("https://github.com/Austin-Tillotson", "github-test-password-123^", "Work", "gitdemouser123", true),
        new("figma.com", "figma-test-password-123^", "Work", "figdemouser123"),
        new("notion.so", "notion-test-password-123^", "Personal", "notdemouser123"),
        new("spotify.com", "spotify-test-password-123^", "Personal", "spotdemouser123", true),
        new("example.com", "example-test-password-123^", null, "exdemouser123"),
        new("wikipedia.org", "wikipedia-test-password-123^", null, "wikidemouser123"),
        new("facebook.com", "facebook-test-password-123^", "Personal", "fbdemouser123", true),
        new("x.com", "x-test-password-123^", "Personal", "xdemouser123", true),
        new("youtube.com", "youtube-test-password-123^", "Personal", "ytdemouser123", true),
        new("etrade.com", "etrade-test-password-123^", "Finance", "etrdemouser123"),
        new("instagram.com", "instagram-test-password-123^", "Personal", "instademouser123"),
    ];
}
