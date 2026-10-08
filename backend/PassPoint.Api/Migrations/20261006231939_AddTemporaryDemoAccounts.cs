using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PassPoint.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTemporaryDemoAccounts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "DemoExpiresAtUtc",
                table: "AspNetUsers",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDemo",
                table: "AspNetUsers",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_IsDemo_DemoExpiresAtUtc",
                table: "AspNetUsers",
                columns: new[] { "IsDemo", "DemoExpiresAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AspNetUsers_IsDemo_DemoExpiresAtUtc",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "DemoExpiresAtUtc",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "IsDemo",
                table: "AspNetUsers");
        }
    }
}
