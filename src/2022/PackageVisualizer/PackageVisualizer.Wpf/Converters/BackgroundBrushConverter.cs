using System;
using System.Globalization;
using System.Windows.Data;
using System.Windows.Media;

namespace PackageVisualizer.Wpf.Converters
{
    public class BackgroundBrushConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        {
            return value is bool and true 
                ? new SolidColorBrush(Color.FromRgb(0x31,0x78,0xD3)) 
                : new SolidColorBrush(Colors.White);
        }

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        {
            throw new NotImplementedException();
        }
    }
}
