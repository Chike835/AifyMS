import { useNavigate, useParams } from 'react-router-dom';
import SaleDetailModal from '../components/sales/SaleDetailModal';

const SaleDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // When accessing via route, we want the modal to be "open"
    // closing it should likely navigate back
    const handleClose = () => {
        navigate(-1);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            {/* 
                Since SaleDetailModal is designed as a fixed overlay, 
                rendering it here should work fine.
                We might want to render a background if the modal doesn't provide one,
                but the modal has `fixed inset-0 bg-black bg-opacity-50`.
                
                However, if we are on a dedicated page, maybe we don't want the "Modal" look 
                (i.e. we might want to just render the content without the overlay if possible),
                but the request specifically asked for "This page should a modal view not a whole page for itself... it should redirect me here."
                
                The request says: "this page should a modal view not a whole page for itself... it should redirect me here."
                
                If the user navigates to /sales/:id, showing the modal ON TOP of a blank page feels weird.
                Ideally, we would show the Sales list AND the modal on top.
                But getting the Sales list to render underneath might be complex if we are at a different route.
                
                For now, wrapping it so it LOOKS like a modal (centered box on gray background) is probably what is meant by "reusable modal component".
                The component I built `SaleDetailModal` has the overlay built-in.
                So if I render it here, it will be a modal over a blank screen.
             */}
            <SaleDetailModal
                isOpen={true}
                onClose={handleClose}
                saleId={id}
            />
        </div>
    );
};

export default SaleDetail;
