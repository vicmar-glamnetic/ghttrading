import { redirect } from 'next/navigation'

// Signals is the default landing page.
export default function Home() {
  redirect('/ideas')
}
