# Creative Days

A repository of PoC projects and other assets for Creative Days.

## 2022

This project will scan a NuGet package and list the dependencies target frameworks. The intention is to replicate with our NuGet server the same kind of dependency awareness features that developers have come to expect from nuget.org-based packages.

For reference, here is what it looks like on nuget.org:

![nuget](https://devblogs.microsoft.com/nuget/wp-content/uploads/sites/49/2022/02/2022-02-15_15-03-01.png)

This can actually be done in as little as 3 lines of code (thanks to the NuGet.Client library), but I wanted to spice it up a little so I wrote a WPF app as a PoC to show what it could be on our website.

Here is a screenshot of my app scanning the Telerik UI MAUI package:

![screenshot](https://user-images.githubusercontent.com/3520532/158469795-b5ded87f-7647-4016-9529-40e2f9d433b9.png)
