// Esqueleto del servidor. I4 completa la API, SignalR y la persistencia (commits 4.1+).
var constructor = WebApplication.CreateBuilder(args);
var aplicacion = constructor.Build();
aplicacion.Run();
