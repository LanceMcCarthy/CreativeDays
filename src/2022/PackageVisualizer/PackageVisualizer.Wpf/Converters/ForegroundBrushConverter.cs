using System;
using System.Globalization;
using System.Windows.Data;
using System.Windows.Media;

namespace PackageVisualizer.Wpf.Converters;

public class ForegroundBrushConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        return value is bool and true 
            ? new SolidColorBrush(Colors.White) 
            : new SolidColorBrush(Color.FromRgb(0x31, 0x78, 0xD3));
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}