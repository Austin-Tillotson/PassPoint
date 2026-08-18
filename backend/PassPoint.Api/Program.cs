using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using PassPoint.Api.Data;
using PassPoint.Api.Models;
using PassPoint.Api.Services;

const string frontendCorsPolicy = "Frontend";

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("PassPoint")
    ?? throw new InvalidOperationException(
        "Connection string 'PassPoint' was not found.");

builder.Services.AddControllers();

builder.Services.AddCors(options =>
{
    options.AddPolicy(frontendCorsPolicy, policy =>
    {
        policy.WithOrigins("http://localhost:4200")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services
    .AddIdentity<ApplicationUser, IdentityRole>(options =>
    {
        options.Password.RequiredLength = 8;
        options.Password.RequireDigit = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireUppercase = true;
        options.Password.RequireNonAlphanumeric = false;
    })
    .AddEntityFrameworkStores<ApplicationDbContext>();

builder.Services.AddDataProtection();
builder.Services.AddSingleton<IPasswordProtector, PasswordProtector>();

builder.Services.AddAuthorization();
builder.Services.AddOpenApi();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseCors(frontendCorsPolicy);

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();