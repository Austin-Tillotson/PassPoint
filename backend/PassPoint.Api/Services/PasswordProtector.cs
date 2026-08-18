using Microsoft.AspNetCore.DataProtection;

namespace PassPoint.Api.Services;

public class PasswordProtector : IPasswordProtector
{
    private readonly IDataProtector _protector;

    public PasswordProtector(IDataProtectionProvider dataProtectionProvider)
    {
        _protector = dataProtectionProvider.CreateProtector(
            "PassPoint.PasswordEntries.v1");
    }

    public string Protect(string value)
    {
        return _protector.Protect(value);
    }

    public string Unprotect(string protectedValue)
    {
        return _protector.Unprotect(protectedValue);
    }
}