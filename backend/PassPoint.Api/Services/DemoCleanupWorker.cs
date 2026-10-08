namespace PassPoint.Api.Services;

public class DemoCleanupWorker(IServiceScopeFactory scopes, ILogger<DemoCleanupWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(15));
        do
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                await scope.ServiceProvider.GetRequiredService<DemoSessionService>().CleanupAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { return; }
            catch (Exception exception)
            {
                logger.LogError(exception, "Demo cleanup failed; the next pass will retry.");
            }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
