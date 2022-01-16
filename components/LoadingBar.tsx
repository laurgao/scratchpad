const LoadingBar = () => {
    return (
        <div className="w-screen h-screen bg-black bg-opacity-80 absolute z-50 flex flex-col items-center justify-center top-0 left-0">
            <p className="text-center text-white text-lg mb-6">Loading files...</p>
            <div 
                className="w-9/12 bg-gray-600 overflow-x-hidden relative" 
                style={{height: 20, borderRadius: 10,}}
            >
                <div className="loading-bar"></div>
            </div>
        </div>
    )
}

export default LoadingBar
