using CommonHelpers.Common;
using CommonHelpers.Mvvm;
using NuGet.Packaging;
using PackageVisualizer.Wpf.Models;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.IO;
using System.Linq;
using System.Windows;
using NuGet.Packaging.Core;

namespace PackageVisualizer.Wpf.ViewModels
{
    public class MainViewModel : ViewModelBase
    {
        private string filePath = @"C:\Users\mccarthy\Downloads\Telerik.UI.for.Maui.0.5.0.nupkg";

        public MainViewModel()
        {
            TargetFrameworkMonikers = new ObservableCollection<Item>();
            LoadDependenciesCommand = new DelegateCommand(LoadDependencies);
            LoadTargetFrameworksCommand = new DelegateCommand(LoadTargetFrameworks);
        }

        public ObservableCollection<Item> TargetFrameworkMonikers { get; set; }

        public string FilePath
        {
            get => filePath;
            set => SetProperty(ref filePath, value, onChanged: TrimDoubleQuotes);
        }

        public DelegateCommand LoadDependenciesCommand { get; set; }

        public DelegateCommand LoadTargetFrameworksCommand { get; set; }

        private void LoadDependencies()
        {
            TargetFrameworkMonikers.Clear();

            if (!File.Exists(FilePath))
            {
                Console.WriteLine("The file path is invalid.");
                return;
            }

            var listedFrameworks = Item.ListTargetFrameworks();

            var tfms = new List<string>();

            using var inputStream = new FileStream(FilePath, FileMode.Open);
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

                if (!tfms.Contains(shortFolderName))
                {
                    tfms.Add(shortFolderName);

                    Console.WriteLine($"Added Dependency TFM: {shortFolderName}");
                }

                foreach (var iv in listedFrameworks.SelectMany(item => item.Versions.Where(iv => iv.Name == shortFolderName)))
                {
                    iv.IsAvailable = true;
                }
            }

            // Todo - possibly update
            foreach (var item in listedFrameworks)
            {
                TargetFrameworkMonikers.Add(item);
            }

            //if (tfms.Count > 0)
            //{
            //    var displayText = tfms.Aggregate("Dependency TFMs:\r\n", (current, dependencyTarget) => current + $"- {dependencyTarget}\r\n");

            //    MessageBox.Show(displayText);
            //}
        }

        private void LoadTargetFrameworks()
        {
            TargetFrameworkMonikers.Clear();

            if (!File.Exists(FilePath))
            {
                Console.WriteLine("The file path is invalid.");
                return;
            }

            var listedFrameworks = Item.ListTargetFrameworks();
            
            var tfms = new List<string>();

            using var inputStream = new FileStream(FilePath, FileMode.Open);
            using var reader = new PackageArchiveReader(inputStream);

            Console.WriteLine($"ID: {reader.NuspecReader.GetId()}");
            Console.WriteLine($"Version: {reader.NuspecReader.GetVersion()}");
            Console.WriteLine();
            Console.WriteLine("Target Frameworks:");
            Console.WriteLine();

            foreach (var frameworkSpecificGroup in reader.NuspecReader.GetFrameworkReferenceGroups())
            {
                var shortFolderName = frameworkSpecificGroup.TargetFramework.GetShortFolderName();

                // The short folder name are missing the dot separator to get a match
                shortFolderName = shortFolderName.Replace("net50", "net5.0");
                shortFolderName = shortFolderName.Replace("net60", "net6.0");
                shortFolderName = shortFolderName.Replace("net70", "net7.0");

                if (!tfms.Contains(shortFolderName))
                {
                    tfms.Add(shortFolderName);

                    Console.WriteLine($"Added Target Framework: {shortFolderName}");
                }

                foreach (var item in listedFrameworks)
                {
                    foreach (var itemVersion in item.Versions)
                    {
                        Console.WriteLine($"{itemVersion.Name} - {shortFolderName}");

                        if (itemVersion.Name == shortFolderName)
                        {
                            itemVersion.IsAvailable = true;
                        }
                    }
                }
            }

            foreach (var item in listedFrameworks)
            {
                TargetFrameworkMonikers.Add(item);
            }
            
            //if (tfms.Count > 0)
            //{
            //    var displayText = tfms.Aggregate("Target Frameworks:\r\n", (current, dependencyTarget) => current + $"- {dependencyTarget}\r\n");

            //    MessageBox.Show(displayText);
            //}
        }

        //private void GetPackageFiles()
        //{
        //    Console.WriteLine("Files:");
        //    foreach (var file in reader.NuspecReader.GetFiles())
        //    {
        //        Console.WriteLine($" - {file}");
        //    }
        //}

        private void TrimDoubleQuotes()
        {
            if (FilePath[0] == '"' || FilePath[^1] == '"')
            {
                FilePath = FilePath.Trim('"');
            }
        }
    }
}
