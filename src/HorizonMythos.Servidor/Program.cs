using HorizonMythos.Servidor.Api;
using HorizonMythos.Servidor.Api.Cuentas;
using HorizonMythos.Servidor.Hubs;
using HorizonMythos.Servidor.Persistencia;
using HorizonMythos.Servidor.Servicios;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;

var constructor = WebApplication.CreateBuilder(args);
IConfiguration configuracion = constructor.Configuration;

string cadenaConexion = configuracion.GetConnectionString("Principal") ?? "";
string cadenaEfectiva = string.IsNullOrWhiteSpace(cadenaConexion)
    ? "Host=localhost;Database=horizon_mythos"
    : cadenaConexion;

constructor.Services.AddDbContext<ContextoBd>(opciones => opciones.UseNpgsql(cadenaEfectiva));
constructor.Services.AddSignalR();
constructor.Services.Configure<OpcionesCombate>(configuracion.GetSection("Combate"));

constructor.Services.AddSingleton<CatalogoServicio>();
constructor.Services.AddSingleton<SalaCombateServicio>();
constructor.Services.AddSingleton<EmparejamientoServicio>();
constructor.Services.AddSingleton<PresenciaServicio>();
constructor.Services.AddScoped<ClasificacionServicio>();
constructor.Services.AddSingleton<IEnvioCorreo, EnvioCorreoSmtp>();

constructor.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(opciones =>
    {
        opciones.Cookie.Name = "hm_sesion";
        opciones.Cookie.HttpOnly = true;
        opciones.Cookie.SameSite = SameSiteMode.Lax;
        opciones.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
        opciones.SlidingExpiration = true;
        opciones.Events.OnRedirectToLogin = contexto =>
        {
            contexto.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
        opciones.Events.OnRedirectToAccessDenied = contexto =>
        {
            contexto.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
    });
constructor.Services.AddAuthorization();

string[] origenes = configuracion.GetSection("Cors:Origenes").Get<string[]>() ?? Array.Empty<string>();
if (origenes.Length > 0)
{
    constructor.Services.AddCors(opciones => opciones.AddDefaultPolicy(politica =>
        politica.WithOrigins(origenes).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));
}

var aplicacion = constructor.Build();

if (configuracion.GetValue("Persistencia:MigrarAutomaticamente", false))
{
    using IServiceScope ambito = aplicacion.Services.CreateScope();
    var bd = ambito.ServiceProvider.GetRequiredService<ContextoBd>();
    bd.Database.Migrate();
}

aplicacion.UseStaticFiles();
if (origenes.Length > 0) aplicacion.UseCors();
aplicacion.UseAuthentication();
aplicacion.UseAuthorization();

aplicacion.MapGet("/api/salud", (IConfiguration cfg) => Results.Ok(new
{
    estado = "ok",
    servicio = "HorizonMythos.Servidor",
    version = "4.6.0",
    persistencia = string.IsNullOrWhiteSpace(cfg.GetConnectionString("Principal"))
        ? "sin-configurar"
        : "configurada",
    utc = DateTimeOffset.UtcNow
}));

aplicacion.MapCatalogo();
aplicacion.MapCuentas();
aplicacion.MapEquipos();
aplicacion.MapRepeticiones();
aplicacion.MapGaleria();
aplicacion.MapRanking();
aplicacion.MapCombates();
aplicacion.MapHub<HubCombate>("/hub/combate");

aplicacion.Run();

public partial class Program { }
