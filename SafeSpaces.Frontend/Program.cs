var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.UseDefaultFiles(); // serves index.html by default
app.UseStaticFiles();

app.Run();