using System.Collections.Generic;
using CommonHelpers.Common;

namespace PackageVisualizer.Wpf.Models;

public class Item : BindableBase
{
    private string productName;
    private List<ItemVersion> versions;

    public string ProductName
    {
        get => productName;
        set => SetProperty(ref productName, value);
    }

    public List<ItemVersion> Versions
    {
        get => versions;
        set => SetProperty(ref versions, value);
    }

    public static List<Item> ListTargetFrameworks()
    {
        return new List<Item>
        {
            new Item
            {
                ProductName = ".NET",
                Versions = new List<ItemVersion>
                {
                    new ItemVersion
                    {
                        Name = "net5.0",
                        AlternateTfm = "net50"
                    },
                    new ItemVersion
                    {
                        Name = "net6.0",
                        AlternateTfm = "net60"
                    },
                    new ItemVersion
                    {
                        Name = "net6.0-android",
                        AlternateTfm = "net60-android"
                    },
                    new ItemVersion
                    {
                        Name = "net6.0-android31.0",
                        AlternateTfm = "net60-android31.0"
                    },
                    new ItemVersion
                    {
                        Name = "net6.0-ios",
                        AlternateTfm = "net60-ios"
                    },
                    new ItemVersion
                    {
                        Name = "net6.0-ios13.6",
                        AlternateTfm = "net60-ios13.6"
                    },
                    new ItemVersion
                    {
                        Name = "net6.0-maccatalyst",
                        AlternateTfm = "net60-maccatalyst"
                    },
                    new ItemVersion
                    {
                        Name = "net6.0-maccatalyst13.5",
                        AlternateTfm = "net60-maccatalyst13.5"
                    },
                    new ItemVersion
                    {
                        Name = "net6.0-macos",
                        AlternateTfm = "net60-macos"
                    },
                    new ItemVersion
                    {
                        Name = "net6.0-tizen6.5",
                        AlternateTfm = "net60-tizen6.5"
                    },
                    new ItemVersion
                    {
                        Name = "net6.0-tvos",
                        AlternateTfm = "net60-tvos"
                    },
                    new ItemVersion
                    {
                        Name = "net6.0-windows",
                        AlternateTfm = "net60-windows"
                    },
                    new ItemVersion
                    {
                        Name = "net6.0-windows10.0.18362",
                        AlternateTfm = "net60-windows10.0.18362"
                    },
                    new ItemVersion
                    {
                        Name = "net6.0-windows10.0.19041",
                        AlternateTfm = "net60-windows10.0.19041"
                    }
                }
            },
            new Item
            {
                ProductName = ".NET Core",
                Versions = new List<ItemVersion>
                {
                    new ItemVersion
                    {
                        Name = "netcoreapp2.0",
                        AlternateTfm = "netcoreapp2.0"
                    },
                    new ItemVersion
                    {
                        Name = "netcoreapp2.1",
                        AlternateTfm = "netcoreapp2.1"
                    },
                    new ItemVersion
                    {
                        Name = "netcoreapp2.2",
                        AlternateTfm = "netcoreapp2.2"
                    },
                    new ItemVersion
                    {
                        Name = "netcoreapp3.0",
                        AlternateTfm = "netcoreapp3.0"
                    },
                    new ItemVersion
                    {
                        Name = "netcoreapp3.1",
                        AlternateTfm = "netcoreapp3.1"
                    }
                }
            },
            new Item
            {
                ProductName = ".NET Standard",
                Versions = new List<ItemVersion>
                {
                    new ItemVersion
                    {
                        Name = "netstandard2.0",
                        AlternateTfm = "netstandard2.0"
                    },
                    new ItemVersion
                    {
                        Name = "netstandard2.1",
                        AlternateTfm = "netstandard2.1"
                    }
                }
            },
            new Item
            {
                ProductName = ".NET Framework",
                Versions = new List<ItemVersion>
                {
                    new ItemVersion
                    {
                        Name = "net20",
                        AlternateTfm = "net20"
                    },
                    new ItemVersion
                    {
                        Name = "net35",
                        AlternateTfm = "net35"
                    },
                    new ItemVersion
                    {
                        Name = "net40",
                        AlternateTfm = "net40"
                    },
                    new ItemVersion
                    {
                        Name = "net45",
                        AlternateTfm = "net45"
                    },
                    new ItemVersion
                    {
                        Name = "net461",
                        AlternateTfm = "net461"
                    },
                    new ItemVersion
                    {
                        Name = "net462",
                        AlternateTfm = "net462"
                    },
                    new ItemVersion
                    {
                        Name = "net463",
                        AlternateTfm = "net463"
                    },
                    new ItemVersion
                    {
                        Name = "net47",
                        AlternateTfm = "net47"
                    },
                    new ItemVersion
                    {
                        Name = "net471",
                        AlternateTfm = "net471"
                    },
                    new ItemVersion
                    {
                        Name = "net472",
                        AlternateTfm = "net472"
                    },
                    new ItemVersion
                    {
                        Name = "net48",
                        AlternateTfm = "net48"
                    }
                }
            },
            new Item
            {
                ProductName = "MonoAndroid",
                Versions = new List<ItemVersion>
                {
                    new ItemVersion
                    {
                        Name = "monoandroid",
                        AlternateTfm = "monoandroid"
                    },
                    new ItemVersion
                    {
                        Name = "monoandroid10.0",
                        AlternateTfm = "monoandroid10.0"
                    }
                }
            },
            new Item
            {
                ProductName = "MonoMac",
                Versions = new List<ItemVersion>
                {
                    new ItemVersion
                    {
                        Name = "monomac",
                        AlternateTfm = "monomac"
                    }
                }
            },
            new Item
            {
                ProductName = "MonoTouch",
                Versions = new List<ItemVersion>
                {
                    new ItemVersion
                    {
                        Name = "monotouch",
                        AlternateTfm = "monotouch"
                    }
                }
            },
            new Item
            {
                ProductName = "Tizen",
                Versions = new List<ItemVersion>
                {
                    new ItemVersion
                    {
                        Name = "tizen40",
                        AlternateTfm = "tizen40"
                    },
                    new ItemVersion
                    {
                        Name = "tizen60",
                        AlternateTfm = "tizen60"
                    }
                }
            },
            new Item
            {
                ProductName = "Xamarin.iOS",
                Versions = new List<ItemVersion>
                {
                    new ItemVersion
                    {
                        Name = "xamarinios",
                        AlternateTfm = "xamarinios"
                    },
                    new ItemVersion
                    {
                        Name = "xamarinios10",
                        AlternateTfm = "xamarinios10"
                    }
                }
            },
            new Item
            {
                ProductName = "Xamain.Mac",
                Versions = new List<ItemVersion>
                {
                    new ItemVersion
                    {
                        Name = "xamarinmac",
                        AlternateTfm = "xamarinmac"
                    },
                    new ItemVersion
                    {
                        Name = "xamarinmac20",
                        AlternateTfm = "xamarinmac20"
                    }
                }
            },
            new Item
            {
                ProductName = "Xamarin.TVOS",
                Versions = new List<ItemVersion>
                {
                    new ItemVersion
                    {
                        Name = "xamarintvos",
                        AlternateTfm = "xamarintvos"
                    }
                }
            },
            new Item
            {
                ProductName = "Xamarin.WatchOS",
                Versions = new List<ItemVersion>
                {
                    new ItemVersion
                    {
                        Name = "xamarinwatchos",
                        AlternateTfm = "xamarinwatchos"
                    }
                }
            }
        };
    }
}