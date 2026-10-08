using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PassPoint.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPasswordEntryUsername : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Username",
                table: "PasswordEntries",
                type: "character varying(256)",
                maxLength: 256,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Username",
                table: "PasswordEntries");
        }
    }
}
