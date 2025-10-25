using Microsoft.AspNetCore.Mvc;

namespace SecretRecorder.Controllers
{
    public class HomeController : Controller
    {
        public IActionResult Index() => View();
    }
}
