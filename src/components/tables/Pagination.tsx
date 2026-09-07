type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const start = Math.max(1, currentPage - 1);
  const end = Math.min(totalPages, currentPage + 1);
  const pagesAroundCurrent = Array.from(
    { length: end - start + 1 },
    (_, index) => start + index
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        type="button"
      >
        Prev
      </button>
      {pagesAroundCurrent.map((page) => (
        <button
          className={`h-10 min-w-10 rounded-lg border px-3 text-sm font-medium ${
            currentPage === page
              ? "border-brand-500 bg-brand-500 text-white"
              : "border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-300"
          }`}
          key={page}
          onClick={() => onPageChange(page)}
          type="button"
        >
          {page}
        </button>
      ))}
      <button
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        type="button"
      >
        Next
      </button>
      <button
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(totalPages)}
        type="button"
      >
        Last Page
      </button>
    </div>
  );
};

export default Pagination;
