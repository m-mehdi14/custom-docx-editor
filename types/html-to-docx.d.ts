declare module "html-to-docx" {
  interface HtmlToDocxOptions {
    pageNumber?: boolean;
    table?: {
      row?: {
        cantSplit?: boolean;
      };
    };
  }

  export default function HTMLtoDOCX(
    htmlString: string,
    headerHTMLString?: string,
    documentOptions?: HtmlToDocxOptions,
    footerHTMLString?: string,
  ): Promise<Buffer>;
}
