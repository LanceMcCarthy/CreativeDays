using System;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using CommonHelpers.Common;

namespace PackageVisualizer.Wpf.Models
{
    public class ItemVersion : BindableBase
    {
        private string name;
        private string alternateTfm;
        private bool isAvailable;

        public string Name
        {
            get => name;
            set => SetProperty(ref name, value);
        }

        public string AlternateTfm
        {
            get => alternateTfm;
            set => SetProperty(ref alternateTfm, value);
        }

        public bool IsAvailable
        {
            get => isAvailable;
            set => SetProperty(ref isAvailable, value);
        }
    }
}
