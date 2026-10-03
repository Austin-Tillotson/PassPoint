using Microsoft.AspNetCore.DataProtection.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using PassPoint.Api.Models;

namespace PassPoint.Api.Data;

public class ApplicationDbContext
    : IdentityDbContext<ApplicationUser>, IDataProtectionKeyContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<PasswordEntry> PasswordEntries => Set<PasswordEntry>();
    public DbSet<Folder> Folders => Set<Folder>();
    public DbSet<DataProtectionKey> DataProtectionKeys => Set<DataProtectionKey>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Folder>(entity =>
        {
            entity.Property(folder => folder.UserId).HasMaxLength(256).IsRequired();
            entity.Property(folder => folder.Name).HasMaxLength(50).IsRequired();
            entity.Property(folder => folder.NormalizedName).HasMaxLength(100).IsRequired();
            entity.HasAlternateKey(folder => new { folder.UserId, folder.Id });
            entity.HasIndex(folder => new { folder.UserId, folder.NormalizedName }).IsUnique();
            entity.HasOne<ApplicationUser>().WithMany().HasForeignKey(folder => folder.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PasswordEntry>(entity =>
        {
            // Enforce account ownership even when rows are written outside the API.
            entity.HasOne<Folder>().WithMany()
                .HasForeignKey(entry => new { entry.UserId, entry.FolderId })
                .HasPrincipalKey(folder => new { folder.UserId, folder.Id })
                .OnDelete(DeleteBehavior.NoAction);
            entity.Property(entry => entry.SiteName)
                .HasMaxLength(200)
                .IsRequired();

            entity.Property(entry => entry.EncryptedPassword)
                .IsRequired();

            entity.Property(entry => entry.UserId)
                .HasMaxLength(256)
                .IsRequired();

            entity.HasOne(entry => entry.User)
                .WithMany(user => user.PasswordEntries)
                .HasForeignKey(entry => entry.UserId)
                .IsRequired()
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
