using System.Net.Http.Json;
using HorizonMythos.Servidor.Persistencia;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace HorizonMythos.Servidor.Pruebas;

/// <summary>Arranca el servidor real con EF Core InMemory y una carpeta temporal de medios.</summary>
public sealed class FabricaServidor : WebApplicationFactory<Program>
{
    private readonly string _baseDatos = "pruebas-" + Guid.NewGuid().ToString("N");
    public string CarpetaMedios { get; } = Path.Combine(Path.GetTempPath(), "horizon-medios-" + Guid.NewGuid().ToString("N"));

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureAppConfiguration((_, configuracion) =>
        {
            configuracion.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Combate:SegundosTurno"] = "120",
                ["Combate:TurnosMaximos"] = "300",
                ["Galeria:Ruta"] = CarpetaMedios,
                ["Sitio:UrlPublica"] = "http://localhost"
            });
        });

        builder.ConfigureServices(servicios =>
        {
            var anteriores = servicios
                .Where(d => d.ServiceType == typeof(ContextoBd) ||
                    (d.ServiceType.IsGenericType &&
                     d.ServiceType.GetGenericArguments().Contains(typeof(ContextoBd))))
                .ToList();
            foreach (var descriptor in anteriores) servicios.Remove(descriptor);

            servicios.AddDbContext<ContextoBd>(opciones => opciones.UseInMemoryDatabase(_baseDatos));
        });
    }

    protected override IHost CreateHost(IHostBuilder builder)
    {
        IHost host = base.CreateHost(builder);
        using IServiceScope ambito = host.Services.CreateScope();
        ambito.ServiceProvider.GetRequiredService<ContextoBd>().Database.EnsureCreated();
        return host;
    }

    public async Task<HttpClient> ClienteAutenticadoAsync(string sufijo)
    {
        HttpClient cliente = CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        var respuesta = await cliente.PostAsJsonAsync("/api/cuentas/registro", new
        {
            nombre = "jugador-" + sufijo,
            correo = $"jugador-{sufijo}@ejemplo.mx",
            contrasena = "secreto123"
        });
        respuesta.EnsureSuccessStatusCode();
        return cliente;
    }

    public static async Task<HubConnection> ConectarHubAsync(FabricaServidor fabrica)
    {
        var conexion = new HubConnectionBuilder()
            .WithUrl(new Uri(fabrica.Server.BaseAddress, "hub/combate"), opciones =>
            {
                opciones.Transports = HttpTransportType.LongPolling;
                opciones.HttpMessageHandlerFactory = _ => fabrica.Server.CreateHandler();
            })
            .Build();
        await conexion.StartAsync();
        return conexion;
    }
}
