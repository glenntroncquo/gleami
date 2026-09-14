"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  RiCloseLargeLine,
  RiLoader4Line,
  RiDeleteBinLine,
} from "@remixicon/react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCompanyId } from "@/lib/company-util";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const SELECT_EMPTY = "_empty";

export type ProductEditorProduct = {
  id: string;
  name: string | null;
  sku: string | null;
  description?: string | null;
  price_gross: number | null;
  price_net?: number | null;
  stock_qty: number | null;
  active: boolean | null;
  created_at: string;
  updated_at: string | null;
  barcode?: string | null;
  cost_price?: number | null;
  vat_rate?: number | null;
  company_id?: string | null;
  product_category_id?: string | null;
  product_line_id?: string | null;
  product_category?: { id: string; name: string | null } | null;
  product_line?: { id: string; name: string | null } | null;
};

type Product = ProductEditorProduct;

interface ProductSheetProps {
  product: ProductEditorProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function ProductSheet({
  product,
  isOpen,
  onClose,
  onRefresh,
}: ProductSheetProps) {
  const t = useTranslations();
  const isMobile = useIsMobile();
  const companyId = useCompanyId();

  const [name, setName] = useState<string>("");
  const [sku, setSku] = useState<string>("");
  const [barcode, setBarcode] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [priceInclVat, setPriceInclVat] = useState<string>("");
  const [costPrice, setCostPrice] = useState<string>("");
  const [vatRate, setVatRate] = useState<string>("21");
  const [stockQty, setStockQty] = useState<string>("");
  const [active, setActive] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  type TaxonomyRow = { id: string; name: string | null };
  const [categories, setCategories] = useState<TaxonomyRow[]>([]);
  const [lines, setLines] = useState<TaxonomyRow[]>([]);
  const [productCategoryId, setProductCategoryId] = useState<string | null>(
    null,
  );
  const [productLineId, setProductLineId] = useState<string | null>(null);
  const [addLineOpen, setAddLineOpen] = useState(false);
  const [newLineName, setNewLineName] = useState("");
  const [savingLine, setSavingLine] = useState(false);

  const loadTaxonomy = useCallback(async () => {
    if (!companyId) return;
    const supabase = createClient();
    const [catRes, lineRes] = await Promise.all([
      supabase
        .from("product_category")
        .select("id, name")
        .eq("is_active", true)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("name"),
      supabase
        .from("product_line")
        .select("id, name")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("name"),
    ]);
    if (catRes.error) {
      console.error("Error loading categories:", catRes.error);
    } else {
      setCategories((catRes.data || []) as TaxonomyRow[]);
    }
    if (lineRes.error) {
      console.error("Error loading product lines:", lineRes.error);
    } else {
      setLines((lineRes.data || []) as TaxonomyRow[]);
    }
  }, [companyId]);

  useEffect(() => {
    if (!isOpen || !companyId) return;
    void loadTaxonomy();
  }, [isOpen, companyId, loadTaxonomy]);

  // Check if all required fields are filled
  const isFormValid = useMemo(() => {
    return (
      !isLoading &&
      name.trim() !== "" &&
      priceInclVat.trim() !== "" &&
      stockQty.trim() !== ""
    );
  }, [isLoading, name, priceInclVat, stockQty]);

  // Net (excl. VAT) from inclusive selling price
  const calculateGrossPrice = (
    inclusivePrice: number,
    vatRate: number,
  ): number => {
    return inclusivePrice / (1 + vatRate / 100);
  };

  // Format price - show decimals only if they exist
  const formatPrice = (price: number): string => {
    if (price % 1 === 0) {
      return price.toString();
    }
    return price.toFixed(2);
  };

  /** Show/store only `.` so typing `,` works (number inputs drop commas in many browsers). */
  const normalizePriceFieldInput = (raw: string) => raw.replace(/,/g, ".");

  /** `.` and `,` both work as decimal separators; if both appear, the rightmost is the decimal mark (1.234,56 vs 1,234.56). */
  const parsePriceInput = (raw: string): number => {
    const trimmed = raw.trim().replace(/\s/g, "");
    if (!trimmed) return NaN;
    const lastDot = trimmed.lastIndexOf(".");
    const lastComma = trimmed.lastIndexOf(",");
    let normalized: string;
    if (lastDot >= 0 && lastComma >= 0) {
      if (lastDot > lastComma) {
        normalized = trimmed.replace(/,/g, "");
      } else {
        normalized = trimmed.replace(/\./g, "").replace(",", ".");
      }
    } else {
      normalized = trimmed.replace(",", ".");
    }
    const n = Number.parseFloat(normalized);
    return Number.isFinite(n) ? n : NaN;
  };

  // Load product data when editing
  const applyProductToForm = (value: Product) => {
    setName(value.name || "");
    setSku(value.sku || "");
    setBarcode(value.barcode || "");
    setDescription(value.description || "");
    const inclVat = value.price_gross || 0;
    setPriceInclVat(formatPrice(inclVat));
    setCostPrice(value.cost_price?.toString() || "");
    setVatRate((value.vat_rate ?? 21).toString());
    setStockQty(value.stock_qty?.toString() || "");
    setActive(value.active ?? true);
    setProductCategoryId(value.product_category_id ?? null);
    setProductLineId(value.product_line_id ?? null);
    setError(null);
  };

  useEffect(() => {
    if (!isOpen) return;
    if (product) {
      applyProductToForm(product);
      return;
    }
    resetForm();
    // applyProductToForm / resetForm are stable setters + synchronous helpers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, isOpen]);

  useEffect(() => {
    const hydrateProduct = async () => {
      if (!isOpen || !product?.id) return;
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("product")
          .select("*, product_category(id, name), product_line(id, name)")
          .eq("id", product.id)
          .single();
        if (data) {
          applyProductToForm(data as Product);
        }
      } catch (fetchError) {
        console.error("Error fetching product details:", fetchError);
      }
    };

    void hydrateProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, product?.id]);

  const resetForm = () => {
    setName("");
    setSku("");
    setBarcode("");
    setDescription("");
    setPriceInclVat("");
    setCostPrice("");
    setVatRate("21");
    setStockQty("0");
    setActive(true);
    setProductCategoryId(null);
    setProductLineId(null);
    setError(null);
    setIsLoading(false);
    setAddLineOpen(false);
    setNewLineName("");
  };

  const handleInclVatPriceChange = (value: string) => {
    setPriceInclVat(normalizePriceFieldInput(value));
  };

  const handleVatRateChange = (value: string) => {
    setVatRate(normalizePriceFieldInput(value));
  };

  const handleSave = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();

      if (!companyId) {
        toast.error(t("products.error.productCreateFailed"));
        setIsLoading(false);
        return;
      }

      const inclParsed = parsePriceInput(priceInclVat) || 0;
      const vatNum = parseFloat(normalizePriceFieldInput(vatRate)) || 21;
      const netParsed = calculateGrossPrice(inclParsed, vatNum);

      const productData = {
        name: name.trim(),
        sku: sku.trim() || null,
        barcode: barcode.trim() || null,
        description: description.trim() || null,
        price_gross: inclParsed,
        price_net: netParsed,
        cost_price: costPrice ? parsePriceInput(costPrice) : null,
        vat_rate: vatNum,
        stock_qty: parseInt(stockQty) || 0,
        active: active,
        company_id: companyId,
        updated_at: new Date().toISOString(),
        product_category_id: productCategoryId,
        product_line_id: productLineId,
      };

      if (product?.id) {
        const { company_id: _companyId, ...updateData } = productData;
        void _companyId;
        const { error } = await supabase
          .from("product")
          .update(updateData)
          .eq("id", product.id);

        if (error) {
          console.error("Error updating product:", error);
          toast.error(t("products.error.productUpdateFailed"));
          setIsLoading(false);
          return;
        }

        toast.success(t("products.success.productUpdated"));
      } else {
        // Create new product
        const { error } = await supabase.from("product").insert({
          ...productData,
          created_at: new Date().toISOString(),
        });

        if (error) {
          console.error("Error creating product:", error);
          toast.error(t("products.error.productCreateFailed"));
          setIsLoading(false);
          return;
        }

        toast.success(t("products.success.productCreated"));
      }

      // Refresh the products list
      onRefresh();

      // Close the sheet
      setIsLoading(false);
      handleClose();
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error(t("common.errorOccurred"));
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!product?.id) {
      toast.error(t("products.error.productDeleteFailed"));
      return;
    }

    try {
      setIsLoading(true);
      const supabase = createClient();

      const { error } = await supabase
        .from("product")
        .delete()
        .eq("id", product.id);

      if (error) {
        console.error("Error deleting product:", error);
        toast.error(t("products.error.productDeleteFailed"));
        setIsLoading(false);
        return;
      }

      toast.success(t("products.success.productDeleted"));

      // Refresh the products list
      onRefresh();

      // Close the sheet
      setIsLoading(false);
      handleClose();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error(t("common.errorOccurred"));
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCreateProductLine = async () => {
    const trimmed = newLineName.trim();
    if (!trimmed || !companyId) {
      toast.error(t("products.addLine.validation"));
      return;
    }
    setSavingLine(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("product_line")
        .insert({
          name: trimmed,
          company_id: companyId,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("id, name")
        .single();

      if (error) {
        console.error("Error creating product line:", error);
        toast.error(t("products.addLine.error"));
        setSavingLine(false);
        return;
      }

      toast.success(t("products.addLine.success"));
      setNewLineName("");
      setAddLineOpen(false);
      await loadTaxonomy();
      if (data?.id) {
        setProductLineId(data.id);
      }
    } catch (e) {
      console.error(e);
      toast.error(t("products.addLine.error"));
    } finally {
      setSavingLine(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={`[&>button:first-of-type]:hidden ${
          isMobile
            ? "h-[90vh] max-h-[90vh] rounded-t-xl border-t-2 border-t-gray-200 bg-white/95 backdrop-blur-sm"
            : "sm:top-4 sm:bottom-4 sm:right-4 sm:h-auto sm:max-h-[calc(100vh-2rem)] sm:rounded-2xl sm:border sm:border-border sm:overflow-hidden"
        }`}
      >
        <div className="border-b-1">
          {isMobile && (
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
            </div>
          )}
          <SheetHeader>
            <div className="flex justify-between w-full p-4">
              <SheetTitle className="text-xl font-bold">
                {product?.id ? t("products.edit") : t("products.create")}
              </SheetTitle>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-6 w-6 text-gray-500"
                aria-label="Close"
              >
                <RiCloseLargeLine size={20} />
              </Button>
            </div>
          </SheetHeader>
        </div>

        {error && (
          <div className="bg-destructive/15 text-destructive rounded-md px-3 py-2 text-sm mx-4">
            {error}
          </div>
        )}

        <div
          className={`grid gap-4 overflow-y-auto ${
            isMobile ? "px-4 pb-4" : "p-4"
          }`}
          style={{
            maxHeight: isMobile ? "calc(90vh - 200px)" : "calc(100vh - 200px)",
          }}
        >
          <div className="*:not-first:mt-1.5">
            <Label htmlFor="product-name">
              {t("products.form.name")} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="product-name"
              type="text"
              placeholder={t("products.form.namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-base"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="*:not-first:mt-1.5">
              <Label htmlFor="product-sku">{t("products.form.sku")}</Label>
              <Input
                id="product-sku"
                type="text"
                placeholder={t("products.form.skuPlaceholder")}
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="text-base"
              />
            </div>
            <div className="*:not-first:mt-1.5">
              <Label htmlFor="product-barcode">
                {t("products.form.barcode")}
              </Label>
              <Input
                id="product-barcode"
                type="text"
                placeholder={t("products.form.barcodePlaceholder")}
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="text-base"
              />
            </div>
          </div>

          <div className="*:not-first:mt-1.5">
            <Label htmlFor="product-description">
              {t("products.form.description")}
            </Label>
            <Textarea
              id="product-description"
              placeholder={t("products.form.descriptionPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-base min-h-[80px]"
            />
          </div>

          <div className="*:not-first:mt-1.5">
            <Label htmlFor="product-category">
              {t("products.form.productCategory")}
            </Label>
            <Select
              value={productCategoryId ?? SELECT_EMPTY}
              onValueChange={(v) =>
                setProductCategoryId(v === SELECT_EMPTY ? null : v)
              }
            >
              <SelectTrigger id="product-category" className="w-full text-base">
                <SelectValue
                  placeholder={t("products.form.productCategoryPlaceholder")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_EMPTY}>
                  {t("products.form.noneOption")}
                </SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name || t("common.unknown")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-end gap-2">
              <div className="*:not-first:mt-1.5 min-w-0 flex-1">
                <Label htmlFor="product-line">
                  {t("products.form.productLine")}
                </Label>
                <Select
                  value={productLineId ?? SELECT_EMPTY}
                  onValueChange={(v) =>
                    setProductLineId(v === SELECT_EMPTY ? null : v)
                  }
                >
                  <SelectTrigger id="product-line" className="w-full text-base">
                    <SelectValue
                      placeholder={t("products.form.productLinePlaceholder")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECT_EMPTY}>
                      {t("products.form.noneOption")}
                    </SelectItem>
                    {lines.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name || t("common.unknown")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => setAddLineOpen(true)}
              >
                {t("products.addLine.trigger")}
              </Button>
            </div>
          </div>

          <Dialog open={addLineOpen} onOpenChange={setAddLineOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("products.addLine.title")}</DialogTitle>
              </DialogHeader>
              <div className="*:not-first:mt-1.5">
                <Label htmlFor="new-product-line-name">
                  {t("products.addLine.nameLabel")}
                </Label>
                <Input
                  id="new-product-line-name"
                  value={newLineName}
                  onChange={(e) => setNewLineName(e.target.value)}
                  placeholder={t("products.addLine.namePlaceholder")}
                  className="text-base"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleCreateProductLine();
                    }
                  }}
                />
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAddLineOpen(false);
                    setNewLineName("");
                  }}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleCreateProductLine()}
                  disabled={savingLine || !newLineName.trim()}
                >
                  {savingLine ? (
                    <RiLoader4Line className="size-4 animate-spin" />
                  ) : (
                    t("common.save")
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="*:not-first:mt-1.5">
            <Label htmlFor="product-cost">{t("products.form.costPrice")}</Label>
            <Input
              id="product-cost"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={costPrice}
              onChange={(e) =>
                setCostPrice(normalizePriceFieldInput(e.target.value))
              }
              className="text-base"
            />
          </div>

          <div className="*:not-first:mt-1.5">
            <Label htmlFor="product-price-incl-vat">
              {t("products.form.priceInclVat")}{" "}
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="product-price-incl-vat"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={priceInclVat}
              onChange={(e) => handleInclVatPriceChange(e.target.value)}
              className="text-base"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="*:not-first:mt-1.5">
              <Label htmlFor="product-vat">{t("products.form.vatRate")}</Label>
              <Input
                id="product-vat"
                type="number"
                step="0.01"
                placeholder="21.00"
                value={vatRate}
                onChange={(e) => handleVatRateChange(e.target.value)}
                className="text-base [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
              />
            </div>
            <div className="*:not-first:mt-1.5">
              <Label htmlFor="product-stock">
                {t("products.form.stockQty")}{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="product-stock"
                type="number"
                placeholder="0"
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
                className="text-base"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="product-active" className="cursor-pointer">
              {t("products.form.active")}
            </Label>
            <Switch
              id="product-active"
              checked={active}
              onCheckedChange={setActive}
            />
          </div>
        </div>

        <SheetFooter
          className={`flex-row sm:justify-between ${
            isMobile ? "px-4 pb-6" : ""
          }`}
        >
          {product?.id && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleDelete}
              disabled={isLoading}
              aria-label="Delete"
            >
              {isLoading ? (
                <RiLoader4Line
                  size={16}
                  className="animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <RiDeleteBinLine size={16} aria-hidden="true" />
              )}
            </Button>
          )}
          <div
            className={`flex flex-1 justify-end gap-2 ${
              isMobile ? "gap-3" : ""
            }`}
          >
            <Button variant="outline" onClick={handleClose}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="default"
              onClick={handleSave}
              disabled={!isFormValid}
              className="min-w-20"
            >
              {isLoading ? (
                <RiLoader4Line size={16} className="animate-spin mr-2" />
              ) : null}
              {t("common.save")}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
