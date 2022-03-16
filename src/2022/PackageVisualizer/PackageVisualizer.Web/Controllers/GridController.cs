using Kendo.Mvc.Extensions;
using Kendo.Mvc.UI;
using Microsoft.AspNetCore.Mvc;
using NuGet.Packaging;
using PackageVisualizer.Web.Models;

namespace PackageVisualizer.Web.Controllers
{
    public class GridController : Controller
    {
        public ActionResult Orders_Read([DataSourceRequest] DataSourceRequest request)
        {
            var result = Enumerable.Range(0, 50).Select(i => new OrderViewModel
            {
                OrderID = i,
                Freight = i * 10,
                OrderDate = new DateTime(2016, 9, 15).AddDays(i % 7),
                ShipName = "ShipName " + i,
                ShipCity = "ShipCity " + i
            });

            var dsResult = result.ToDataSourceResult(request);
            return Json(dsResult);
        }

        public ActionResult Dependencies_Read([DataSourceRequest] DataSourceRequest request)
        {
            var filePath = @"EmbeddedPackages\Telerik.UI.for.Maui.0.5.0.nupkg";

            if (!System.IO.File.Exists(filePath))
            {
                return BadRequest("Bad file path");
            }
            
            var listedFrameworks = ItemViewModel.ListTargetFrameworks();
            
            using var inputStream = new FileStream(filePath, FileMode.Open);
            using var reader = new PackageArchiveReader(inputStream);

            Console.WriteLine($"ID: {reader.NuspecReader.GetId()}");
            Console.WriteLine($"Version: {reader.NuspecReader.GetVersion()}");
            Console.WriteLine();
            Console.WriteLine("Dependency Target Frameworks:");
            Console.WriteLine();

            foreach (var dependencyGroup in reader.NuspecReader.GetDependencyGroups())
            {
                var shortFolderName = dependencyGroup.TargetFramework.GetShortFolderName();
                
                // The short folder name are missing the dot separator to get a match
                shortFolderName = shortFolderName.Replace("net50", "net5.0");
                shortFolderName = shortFolderName.Replace("net60", "net6.0");
                shortFolderName = shortFolderName.Replace("net70", "net7.0");
                
                foreach (var iv in listedFrameworks.SelectMany(item => item.Versions.Where(iv => iv.Name == shortFolderName)))
                {
                    iv.IsAvailable = true;
                }
            }
            
            var dsResult = listedFrameworks.ToDataSourceResult(request);
            
            return Json(dsResult);
        }
    }
}
