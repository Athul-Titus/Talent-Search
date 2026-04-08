import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

export async function exportToPdf(elementRef, filename = 'dossier.pdf') {
  if (!elementRef.current) return false

  try {
    // Force a small delay to ensure React finishes rendering the hidden DOM node
    await new Promise(r => setTimeout(r, 100))

    const canvas = await html2canvas(elementRef.current, {
      scale: 2, // High resolution
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    })

    const imgData = canvas.toDataURL('image/png')
    
    // Calculate A4 dimensions
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
    pdf.save(filename)
    return true
  } catch (error) {
    console.error('PDF Export failed:', error)
    return false
  }
}
