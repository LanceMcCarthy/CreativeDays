# Creative Days

A repository of PoC projects and other assets for Creative Days.

## 2022 - NuGet Package Visualizer

This project will scan a NuGet package and list the dependencies target frameworks. The intention is to add highly desired functionality to nuget.telerik.com. Where going to an endpoint like `nuget.telerik.com/visualizer` would provide our customers with same kind of dependency awareness features that developers have come to expect from nuget.org-based packages.

This can actually be done in as little as 3 lines of code (thanks to the NuGet.Client library), but I wanted to spice it up a little so I wrote a WPF and ASP.NET Core MVC app as a proof of concept to show what it could look like on our site!

## Runtime Examples

Here is a screenshot of my app scanning the Telerik UI MAUI package:

### ASP.NET Core (.NET 6) app

![image](https://user-images.githubusercontent.com/3520532/159092811-d0460a93-2a76-427f-8fa1-697df6b69108.png)

### WPF (.NET6) app:

![screenshot](https://user-images.githubusercontent.com/3520532/158469795-b5ded87f-7647-4016-9529-40e2f9d433b9.png)

## NuGet.org Reference

For reference, here is what it looks like on nuget.org:

![nuget](https://devblogs.microsoft.com/nuget/wp-content/uploads/sites/49/2022/02/2022-02-15_15-03-01.png)
