namespace PassPoint.Api.Services;

public interface IPasswordProtector
{
    string Protect(string value);

    string Unprotect(string protectedValue);
}