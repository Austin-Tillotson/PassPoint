using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using PassPoint.Api.Models;

namespace PassPoint.Api.Data;

public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<PasswordEntry> PasswordEntries => Set<PasswordEntry>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<PasswordEntry>(entity =>
        {
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