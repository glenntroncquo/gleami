type JsonLdProps = {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
};

export function JsonLd({ data }: JsonLdProps) {
  const nodes = Array.isArray(data) ? data : [data];

  return (
    <>
      {nodes.map((node, index) => (
        <script
          key={`${String(node["@type"] ?? "node")}-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(node).replace(/</g, "\\u003c"),
          }}
        />
      ))}
    </>
  );
}
