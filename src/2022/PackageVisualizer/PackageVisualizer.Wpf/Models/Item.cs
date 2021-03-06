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
                        Name = "net5.0"
                    },
                    new ItemVersion
                    {
                        Name = "net6.0"
                    },
                    new ItemVersion
                    {
                        Name = "net6.0-android"
                    },
                    new ItemVersion
                    {
                        Name = "net6.0-android31.0"
                    },
                    new ItemVersion
                    {
                        Name = "net6.0-ios"
                    },
                    new ItemVersion
                    {
                        Name = "net6.0-ios13.6"
                    },
                    new ItemVersion
                    {
                        Name = "net6.0-maccatalyst"
                    },
                    new ItemVersion
                    {
                        Name = "net6.0-maccatalyst13.5"
                    },
                    new ItemVersion
                    {
                        Name = "net6.0-macos"
                    },
                    new ItemVersion
                    {
                        Name = "net6.0-tizen6.5"
                    },
                    new ItemVersion
                    {
                        Name = "net6.0-tvos"
                    },
                    new ItemVersion
                    {
                        Name = "net6.0-windows"
                    },
                    new ItemVersion
                    {
                        Name = "net6.0-windows10.0.18362"
                    },
                    new ItemVersion
                    {
                        Name = "net6.0-windows10.0.19041"
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
                        Name = "netcoreapp2.0"
                    },
                    new ItemVersion
                    {
                        Name = "netcoreapp2.1"
                    },
                    new ItemVersion
                    {
                        Name = "netcoreapp2.2"
                    },
                    new ItemVersion
                    {
                        Name = "netcoreapp3.0"
                    },
                    new ItemVersion
                    {
                        Name = "netcoreapp3.1"
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
                        Name = "netstandard2.0"
                    },
                    new ItemVersion
                    {
                        Name = "netstandard2.1"
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
                        Name = "net20"
                    },
                    new ItemVersion
                    {
                        Name = "net35"
                    },
                    new ItemVersion
                    {
                        Name = "net40"
                    },
                    new ItemVersion
                    {
                        Name = "net45"
                    },
                    new ItemVersion
                    {
                        Name = "net461"
                    },
                    new ItemVersion
                    {
                        Name = "net462"
                    },
                    new ItemVersion
                    {
                        Name = "net463"
                    },
                    new ItemVersion
                    {
                        Name = "net47"
                    },
                    new ItemVersion
                    {
                        Name = "net471"
                    },
                    new ItemVersion
                    {
                        Name = "net472"
                    },
                    new ItemVersion
                    {
                        Name = "net48"
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
                        Name = "monoandroid"
                    },
                    new ItemVersion
                    {
                        Name = "monoandroid10.0"
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
                        Name = "monomac"
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
                        Name = "monotouch"
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
                        Name = "tizen40"
                    },
                    new ItemVersion
                    {
                        Name = "tizen60"
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
                        Name = "xamarinios"
                    },
                    new ItemVersion
                    {
                        Name = "xamarinios10"
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
                        Name = "xamarinmac"
                    },
                    new ItemVersion
                    {
                        Name = "xamarinmac20"
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
                        Name = "xamarintvos"
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
                        Name = "xamarinwatchos"
                    }
                }
            }
        };
    }
}