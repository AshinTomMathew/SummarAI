import { useNavigate } from 'react-router-dom';

export default function BackButton({ className = "" }) {
    const navigate = useNavigate();

    return (
        <button
            onClick={() => navigate(-1)}
            className={`flex items-center gap-2 p-2 pr-4 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors border border-white/5 ${className}`}
        >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            <span className="text-sm font-medium">Back</span>
        </button>
    );
}
