using CommonHelpers.Common;

namespace PackageVisualizer.Web.Models
{
    public class ItemVersion : BindableBase
    {
        private string name;
        private bool isAvailable;

        public string Name
        {
            get => name;
            set => SetProperty(ref name, value);
        }

        public bool IsAvailable
        {
            get => isAvailable;
            set => SetProperty(ref isAvailable, value);
        }
    }
}
