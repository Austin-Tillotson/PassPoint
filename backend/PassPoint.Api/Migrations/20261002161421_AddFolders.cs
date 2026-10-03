using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PassPoint.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddFolders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PasswordEntries_UserId",
                table: "PasswordEntries");

            migrationBuilder.AddColumn<Guid>(
                name: "FolderId",
                table: "PasswordEntries",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Folders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    Name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    NormalizedName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Folders", x => x.Id);
                    table.UniqueConstraint("AK_Folders_UserId_Id", x => new { x.UserId, x.Id });
                    table.ForeignKey(
                        name: "FK_Folders_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PasswordEntries_UserId_FolderId",
                table: "PasswordEntries",
                columns: new[] { "UserId", "FolderId" });

            migrationBuilder.CreateIndex(
                name: "IX_Folders_UserId_NormalizedName",
                table: "Folders",
                columns: new[] { "UserId", "NormalizedName" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_PasswordEntries_Folders_UserId_FolderId",
                table: "PasswordEntries",
                columns: new[] { "UserId", "FolderId" },
                principalTable: "Folders",
                principalColumns: new[] { "UserId", "Id" });

            // Seed once for existing accounts. Later user deletions are not recreated.
            migrationBuilder.Sql("""
                INSERT INTO "Folders" ("Id", "UserId", "Name", "NormalizedName")
                SELECT gen_random_uuid(), u."Id", defaults.name, upper(defaults.name)
                FROM "AspNetUsers" u
                CROSS JOIN (VALUES ('Work'), ('Personal'), ('Finance')) AS defaults(name);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PasswordEntries_Folders_UserId_FolderId",
                table: "PasswordEntries");

            migrationBuilder.DropTable(
                name: "Folders");

            migrationBuilder.DropIndex(
                name: "IX_PasswordEntries_UserId_FolderId",
                table: "PasswordEntries");

            migrationBuilder.DropColumn(
                name: "FolderId",
                table: "PasswordEntries");

            migrationBuilder.CreateIndex(
                name: "IX_PasswordEntries_UserId",
                table: "PasswordEntries",
                column: "UserId");
        }
    }
}
