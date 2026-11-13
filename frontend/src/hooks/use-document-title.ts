import { useLayoutEffect } from "react";

export function useDocumentTitle(title: string): void {
  useLayoutEffect(() => {
    document.title = title;
  }, [title]);
}

